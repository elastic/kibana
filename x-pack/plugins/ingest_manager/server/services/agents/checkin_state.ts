/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timer, from, Observable } from 'rxjs';
import { shareReplay, distinctUntilKeyChanged, switchMap, tap, merge } from 'rxjs/operators';
import {
  SavedObjectsClientContract,
  KibanaRequest,
  SavedObjectsBulkUpdateObject,
} from 'src/core/server';
import { Agent, AgentAction, AgentSOAttributes, AgentConfig, FullAgentConfig } from '../../types';

import { agentConfigService } from '../agent_config';
import * as APIKeysService from '../api_keys';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { createAgentAction, getNewActionsSince } from './actions';
import { appContextService } from '../app_context';

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

function createAgentConfigObservable(configId: string) {
  const internalSOClient = appContextService.getInternalUserSOClient(fakeRequest);
  return timer(0, 3000).pipe(
    switchMap(() =>
      from(agentConfigService.get(internalSOClient, configId) as Promise<AgentConfig>).pipe(
        tap(() => appContextService.getLogger().info(`Fetch agent config ${configId}`))
      )
    ),
    distinctUntilKeyChanged('revision'),
    switchMap((data) => from(agentConfigService.getFullConfig(internalSOClient, configId))),
    shareReplay({ refCount: true, bufferSize: 1 })
  );
}

function createNewActionsObservable() {
  return timer(0, 3000).pipe(
    switchMap(() => {
      const internalSOClient = appContextService.getInternalUserSOClient(fakeRequest);

      return from(getNewActionsSince(internalSOClient, new Date().toISOString())).pipe(
        tap(() => appContextService.getLogger().info(`Fetch new actions`))
      );
    }),
    switchMap((data) => {
      return data;
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

function agentCheckinStateFactory() {
  const connectedAgentsIds = new Set<string>();

  async function updateLastCheckinAt() {
    if (connectedAgentsIds.size === 0) {
      return;
    }
    const internalSOClient = appContextService.getInternalUserSOClient(fakeRequest);
    const now = new Date().toISOString();
    const updates: Array<SavedObjectsBulkUpdateObject<AgentSOAttributes>> = [
      ...connectedAgentsIds.values(),
    ].map((agentId) => ({
      type: AGENT_SAVED_OBJECT_TYPE,
      id: agentId,
      attributes: {
        last_checkin: now,
      },
    }));

    await internalSOClient.bulkUpdate<AgentSOAttributes>(updates, { refresh: false });
  }

  // Observables
  const agentConfigs$ = new Map<string, Observable<FullAgentConfig | null>>();
  const newActions$ = createNewActionsObservable();

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
      agentConfigs$.set(configId, createAgentConfigObservable(configId));
    }

    connectedAgentsIds.add(agent.id);
    try {
      const actions: AgentAction[] = await new Promise((resolve, reject) => {
        const agentConfig$ = agentConfigs$.get(configId);
        if (!agentConfig$) {
          throw new Error(`Invalid state no observable for config ${configId}`);
        }
        const stream$ = agentConfig$.pipe(merge(newActions$));

        const subscription = stream$.subscribe(
          async (data) => {
            if (Array.isArray(data)) {
              const newActions = (data as AgentAction[]).filter((action) => action.agent_id);
              if (newActions.length === 0) {
                return;
              }
              subscription.unsubscribe();
              resolve(newActions);
            }

            if (!data || !(data as AgentConfig).revision) {
              return;
            }

            const config = (data as unknown) as AgentConfig;

            const isAgentConfigOutdated =
              !agent.config_revision || agent.config_revision < config.revision;
            if (!isAgentConfigOutdated) {
              return;
            }

            // Deep clone !not supporting Date, and undefined value.
            const newConfig = JSON.parse(JSON.stringify(config));

            // Mutate the config to set the api token for this agent
            newConfig.outputs.default.api_key = await getOrCreateAgentDefaultOutputAPIKey(
              soClient,
              agent
            );

            const configChangeAction = await createAgentAction(soClient, {
              agent_id: agent.id,
              type: 'CONFIG_CHANGE',
              data: { config: newConfig } as any,
              created_at: new Date().toISOString(),
              sent_at: undefined,
            });
            subscription.unsubscribe();
            resolve([configChangeAction]);
          },
          (err) => {
            subscription.unsubscribe();
            reject(err);
          }
        );
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            subscription.unsubscribe();
            reject(new Error('Request aborted'));
          });
        }
      });
      connectedAgentsIds.delete(agent.id);

      return actions;
    } catch (err) {
      connectedAgentsIds.delete(agent.id);
      throw err;
    }
  }

  function start() {
    setInterval(async () => {
      try {
        await updateLastCheckinAt();
      } catch (err) {
        appContextService.getLogger().error(err);
      }
    }, 30 * 1000);
  }

  return {
    subscribeToNewActions,
    start,
  };
}

export const agentCheckinState = agentCheckinStateFactory();

agentCheckinState.start();
