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
  AgentConfig,
  FullAgentConfig,
} from '../../../types';
import { agentConfigService } from '../../agent_config';
import * as APIKeysService from '../../api_keys';
import { AGENT_SAVED_OBJECT_TYPE, AGENT_UPDATE_ACTIONS_INTERVAL_MS } from '../../../constants';
import { createAgentAction, getNewActionsSince } from '../actions';
import { appContextService } from '../../app_context';
import { toPromiseAbortable, AbortError, createLimiter } from './rxjs_utils';

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

function createAgentConfigSharedObservable(configId: string) {
  const internalSOClient = getInternalUserSOClient();
  return timer(0, AGENT_UPDATE_ACTIONS_INTERVAL_MS).pipe(
    switchMap(() =>
      from(agentConfigService.get(internalSOClient, configId) as Promise<AgentConfig>)
    ),
    distinctUntilKeyChanged('revision'),
    switchMap((data) => from(agentConfigService.getFullConfig(internalSOClient, configId))),
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

function shouldCreateAgentConfigAction(agent: Agent, config: FullAgentConfig | null): boolean {
  if (!config || !config.revision) {
    return false;
  }
  const isAgentConfigOutdated = !agent.config_revision || agent.config_revision < config.revision;
  if (!isAgentConfigOutdated) {
    return false;
  }

  return true;
}

async function createAgentActionFromConfig(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  config: FullAgentConfig | null
) {
  // Deep clone !not supporting Date, and undefined value.
  const newConfig = JSON.parse(JSON.stringify(config));

  // Mutate the config to set the api token for this agent
  newConfig.outputs.default.api_key = await getOrCreateAgentDefaultOutputAPIKey(soClient, agent);

  const configChangeAction = await createAgentAction(soClient, {
    agent_id: agent.id,
    type: 'CONFIG_CHANGE',
    data: { config: newConfig } as any,
    created_at: new Date().toISOString(),
    sent_at: undefined,
  });

  return [configChangeAction];
}

export function agentCheckinStateNewActionsFactory() {
  // Shared Observables
  const agentConfigs$ = new Map<string, Observable<FullAgentConfig | null>>();
  const newActions$ = createNewActionsSharedObservable();
  // Rx operators
  const rateLimiter = createLimiter(
    appContextService.getConfig()?.fleet.agentConfigRollupRateLimitIntervalMs || 5000,
    appContextService.getConfig()?.fleet.agentConfigRollupRateLimitRequestPerInterval || 50
  );

  async function subscribeToNewActions(
    soClient: SavedObjectsClientContract,
    agent: Agent,
    options?: { signal: AbortSignal }
  ): Promise<AgentAction[]> {
    if (!agent.config_id) {
      throw new Error('Agent do not have a config');
    }
    const configId = agent.config_id;
    if (!agentConfigs$.has(configId)) {
      agentConfigs$.set(configId, createAgentConfigSharedObservable(configId));
    }
    const agentConfig$ = agentConfigs$.get(configId);
    if (!agentConfig$) {
      throw new Error(`Invalid state no observable for config ${configId}`);
    }
    const stream$ = agentConfig$.pipe(
      timeout(appContextService.getConfig()?.fleet.pollingRequestTimeout || 0),
      filter((config) => shouldCreateAgentConfigAction(agent, config)),
      rateLimiter(),
      mergeMap((config) => createAgentActionFromConfig(soClient, agent, config)),
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
