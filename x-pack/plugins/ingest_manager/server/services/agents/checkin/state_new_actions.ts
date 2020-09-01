/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timer, from, Observable, TimeoutError } from 'rxjs';
import {
  shareReplay,
  distinctUntilKeyChanged,
  switchMap,
  mergeMap,
  merge,
  filter,
  timeout,
  take,
} from 'rxjs/operators';
import { SavedObjectsClientContract, KibanaRequest } from 'src/core/server';
import {
  Agent,
  AgentAction,
  AgentSOAttributes,
  AgentPolicy,
  FullAgentPolicy,
} from '../../../types';
import { agentPolicyService } from '../../agent_policy';
import * as APIKeysService from '../../api_keys';
import {
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_UPDATE_ACTIONS_INTERVAL_MS,
  AGENT_POLICY_ROLLOUT_RATE_LIMIT_INTERVAL_MS,
  AGENT_POLICY_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL,
} from '../../../constants';
import { createAgentAction, getNewActionsSince } from '../actions';
import { appContextService } from '../../app_context';
import { toPromiseAbortable, AbortError, createRateLimiter } from './rxjs_utils';

function getInternalUserSOClient() {
  const fakeRequest = ({
    headers: {},
    getBasePath: () => '',
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
  } as unknown) as KibanaRequest;

  return appContextService.getInternalUserSOClient(fakeRequest);
}

function createAgentPolicySharedObservable(agentPolicyId: string) {
  const internalSOClient = getInternalUserSOClient();
  return timer(0, AGENT_UPDATE_ACTIONS_INTERVAL_MS).pipe(
    switchMap(() =>
      from(agentPolicyService.get(internalSOClient, agentPolicyId) as Promise<AgentPolicy>)
    ),
    distinctUntilKeyChanged('revision'),
    switchMap((data) =>
      from(agentPolicyService.getFullAgentPolicy(internalSOClient, agentPolicyId))
    ),
    shareReplay({ refCount: true, bufferSize: 1 })
  );
}

function createNewActionsSharedObservable(): Observable<AgentAction[]> {
  return timer(0, AGENT_UPDATE_ACTIONS_INTERVAL_MS).pipe(
    switchMap(() => {
      const internalSOClient = getInternalUserSOClient();

      return from(getNewActionsSince(internalSOClient, new Date().toISOString()));
    }),
    shareReplay({ refCount: true, bufferSize: 1 })
  );
}

async function getOrCreateAgentDefaultOutputAPIKey(
  soClient: SavedObjectsClientContract,
  agent: Agent
): Promise<string> {
  const {
    attributes: { default_api_key: defaultApiKey },
  } = await appContextService
    .getEncryptedSavedObjects()
    .getDecryptedAsInternalUser<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id);

  if (defaultApiKey) {
    return defaultApiKey;
  }

  const outputAPIKey = await APIKeysService.generateOutputApiKey(soClient, 'default', agent.id);
  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agent.id, {
    default_api_key: outputAPIKey.key,
    default_api_key_id: outputAPIKey.id,
  });

  return outputAPIKey.key;
}

function shouldCreateAgentPolicyAction(agent: Agent, agentPolicy: FullAgentPolicy | null): boolean {
  if (!agentPolicy || !agentPolicy.revision) {
    return false;
  }
  const isAgentPolicyOutdated =
    !agent.policy_revision || agent.policy_revision < agentPolicy.revision;
  if (!isAgentPolicyOutdated) {
    return false;
  }

  return true;
}

async function createAgentActionFromAgentPolicy(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  policy: FullAgentPolicy | null
) {
  // Deep clone !not supporting Date, and undefined value.
  const newAgentPolicy = JSON.parse(JSON.stringify(policy));

  // Mutate the policy to set the api token for this agent
  newAgentPolicy.outputs.default.api_key = await getOrCreateAgentDefaultOutputAPIKey(
    soClient,
    agent
  );

  const policyChangeAction = await createAgentAction(soClient, {
    agent_id: agent.id,
    type: 'CONFIG_CHANGE',
    data: { config: newAgentPolicy } as any,
    created_at: new Date().toISOString(),
    sent_at: undefined,
  });

  return [policyChangeAction];
}

export function agentCheckinStateNewActionsFactory() {
  // Shared Observables
  const agentPolicies$ = new Map<string, Observable<FullAgentPolicy | null>>();
  const newActions$ = createNewActionsSharedObservable();
  // Rx operators
  const rateLimiter = createRateLimiter(
    appContextService.getConfig()?.fleet.agentPolicyRolloutRateLimitIntervalMs ??
      AGENT_POLICY_ROLLOUT_RATE_LIMIT_INTERVAL_MS,
    appContextService.getConfig()?.fleet.agentPolicyRolloutRateLimitRequestPerInterval ??
      AGENT_POLICY_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL
  );

  async function subscribeToNewActions(
    soClient: SavedObjectsClientContract,
    agent: Agent,
    options?: { signal: AbortSignal }
  ): Promise<AgentAction[]> {
    if (!agent.policy_id) {
      throw new Error('Agent does not have a policy');
    }
    const agentPolicyId = agent.policy_id;
    if (!agentPolicies$.has(agentPolicyId)) {
      agentPolicies$.set(agentPolicyId, createAgentPolicySharedObservable(agentPolicyId));
    }
    const agentPolicy$ = agentPolicies$.get(agentPolicyId);
    if (!agentPolicy$) {
      throw new Error(`Invalid state, no observable for policy ${agentPolicyId}`);
    }

    const stream$ = agentPolicy$.pipe(
      timeout(appContextService.getConfig()?.fleet.pollingRequestTimeout || 0),
      filter((agentPolicy) => shouldCreateAgentPolicyAction(agent, agentPolicy)),
      rateLimiter(),
      mergeMap((agentPolicy) => createAgentActionFromAgentPolicy(soClient, agent, agentPolicy)),
      merge(newActions$),
      mergeMap(async (data) => {
        if (!data) {
          return;
        }
        const newActions = data.filter((action) => action.agent_id);
        if (newActions.length === 0) {
          return;
        }

        return newActions;
      }),
      filter((data) => data !== undefined),
      take(1)
    );
    try {
      const data = await toPromiseAbortable(stream$, options?.signal);

      return data || [];
    } catch (err) {
      if (err instanceof TimeoutError || err instanceof AbortError) {
        return [];
      }

      throw err;
    }
  }

  return {
    subscribeToNewActions,
  };
}
