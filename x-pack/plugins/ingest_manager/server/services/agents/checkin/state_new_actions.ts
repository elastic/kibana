/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timer, from, Observable, TimeoutError, of } from 'rxjs';
import { omit } from 'lodash';
import {
  shareReplay,
  share,
  distinctUntilKeyChanged,
  switchMap,
  merge,
  filter,
  timeout,
  take,
} from 'rxjs/operators';
import { SavedObjectsClientContract, KibanaRequest } from 'src/core/server';
import { Agent, AgentAction, AgentPolicyAction, AgentSOAttributes } from '../../../types';
import * as APIKeysService from '../../api_keys';
import {
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_UPDATE_ACTIONS_INTERVAL_MS,
  AGENT_POLICY_ROLLOUT_RATE_LIMIT_INTERVAL_MS,
  AGENT_POLICY_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL,
} from '../../../constants';
import {
  getNewActionsSince,
  getLatestConfigChangeAction,
  getAgentPolicyActionByIds,
} from '../actions';
import { appContextService } from '../../app_context';
import { toPromiseAbortable, AbortError, createRateLimiter } from './rxjs_utils';
import { getAgent } from '../crud';

const RATE_LIMIT_MAX_DELAY_MS = 5 * 60 * 1000; // 5 minutes

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

function createNewActionsSharedObservable(): Observable<AgentAction[]> {
  let lastTimestamp = new Date().toISOString();

  return timer(0, AGENT_UPDATE_ACTIONS_INTERVAL_MS).pipe(
    switchMap(() => {
      const internalSOClient = getInternalUserSOClient();

      const timestamp = lastTimestamp;
      lastTimestamp = new Date().toISOString();
      return from(getNewActionsSince(internalSOClient, timestamp));
    }),
    filter((data) => data.length > 0),
    share()
  );
}

function createAgentPolicyActionSharedObservable(agentPolicyId: string) {
  const internalSOClient = getInternalUserSOClient();

  return timer(0, AGENT_UPDATE_ACTIONS_INTERVAL_MS).pipe(
    switchMap(() => from(getLatestConfigChangeAction(internalSOClient, agentPolicyId))),
    filter((data): data is AgentPolicyAction => data !== undefined),
    distinctUntilKeyChanged('id'),
    switchMap((data) =>
      from(getAgentPolicyActionByIds(internalSOClient, [data.id]).then((r) => r[0]))
    ),
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

async function createAgentActionFromPolicyAction(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  policyAction: AgentPolicyAction
) {
  const newAgentAction: AgentAction = Object.assign(
    omit(
      // Faster than clone
      JSON.parse(JSON.stringify(policyAction)) as AgentPolicyAction,
      'policy_id',
      'policy_revision'
    ),
    {
      agent_id: agent.id,
    }
  );

  // Mutate the policy to set the api token for this agent
  newAgentAction.data.config.outputs.default.api_key = await getOrCreateAgentDefaultOutputAPIKey(
    soClient,
    agent
  );

  return [newAgentAction];
}

export function agentCheckinStateNewActionsFactory() {
  // Shared Observables
  const agentPolicies$ = new Map<string, Observable<AgentPolicyAction>>();
  const newActions$ = createNewActionsSharedObservable();
  // Rx operators
  const pollingTimeoutMs = appContextService.getConfig()?.fleet.pollingRequestTimeout ?? 0;
  const rateLimiterIntervalMs =
    appContextService.getConfig()?.fleet.agentPolicyRolloutRateLimitIntervalMs ??
    AGENT_POLICY_ROLLOUT_RATE_LIMIT_INTERVAL_MS;
  const rateLimiterRequestPerInterval =
    appContextService.getConfig()?.fleet.agentPolicyRolloutRateLimitRequestPerInterval ??
    AGENT_POLICY_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL;
  const rateLimiterMaxDelay = Math.min(RATE_LIMIT_MAX_DELAY_MS, pollingTimeoutMs);

  const rateLimiter = createRateLimiter(
    rateLimiterIntervalMs,
    rateLimiterRequestPerInterval,
    rateLimiterMaxDelay
  );

  function getOrCreateAgentPolicyObservable(agentPolicyId: string) {
    if (!agentPolicies$.has(agentPolicyId)) {
      agentPolicies$.set(agentPolicyId, createAgentPolicyActionSharedObservable(agentPolicyId));
    }
    const agentPolicy$ = agentPolicies$.get(agentPolicyId);
    if (!agentPolicy$) {
      throw new Error(`Invalid state, no observable for policy ${agentPolicyId}`);
    }

    return agentPolicy$;
  }

  async function subscribeToNewActions(
    soClient: SavedObjectsClientContract,
    agent: Agent,
    options?: { signal: AbortSignal }
  ): Promise<AgentAction[]> {
    if (!agent.policy_id) {
      throw new Error('Agent does not have a policy');
    }
    const agentPolicy$ = getOrCreateAgentPolicyObservable(agent.policy_id);

    const stream$ = agentPolicy$.pipe(
      timeout(
        // Set a timeout 3s before the real timeout to have a chance to respond an empty response before socket timeout
        Math.max(pollingTimeoutMs - 3000, 3000)
      ),
      filter(
        (action) =>
          agent.policy_id !== undefined &&
          action.policy_revision !== undefined &&
          action.policy_id !== undefined &&
          action.policy_id === agent.policy_id &&
          (!agent.policy_revision || action.policy_revision > agent.policy_revision)
      ),
      rateLimiter(),
      concatMap((policyAction) => createAgentActionFromPolicyAction(soClient, agent, policyAction)),
      merge(newActions$),
      concatMap((data: AgentAction[] | undefined) => {
        if (data === undefined) {
          return of(undefined);
        }
        const newActions = data.filter((action) => action.agent_id === agent.id);
        if (newActions.length === 0) {
          return of(undefined);
        }

        const hasConfigReassign = newActions.some(
          (action) => action.type === 'INTERNAL_POLICY_REASSIGN'
        );
        if (hasConfigReassign) {
          return from(getAgent(soClient, agent.id)).pipe(
            concatMap((refreshedAgent) => {
              if (!refreshedAgent.policy_id) {
                throw new Error('Agent does not have a policy assigned');
              }
              const newAgentPolicy$ = getOrCreateAgentPolicyObservable(refreshedAgent.policy_id);
              return newAgentPolicy$;
            }),
            rateLimiter(),
            concatMap((policyAction) =>
              createAgentActionFromPolicyAction(soClient, agent, policyAction)
            )
          );
        }

        return of(newActions);
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
