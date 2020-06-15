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
import { toPromiseAbortable, AbortError } from './rxjs_utils';

const UPDATE_ACTIONS_INTERVAL_MS = 10000;
const UPDATE_LAST_CHECKIN_INTERVAL_MS = 15000;

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
  return timer(0, UPDATE_ACTIONS_INTERVAL_MS).pipe(
    switchMap(() =>
      from(agentConfigService.get(internalSOClient, configId) as Promise<AgentConfig>)
    ),
    distinctUntilKeyChanged('revision'),
    switchMap((data) => from(agentConfigService.getFullConfig(internalSOClient, configId))),
    shareReplay({ refCount: true, bufferSize: 1 })
  );
}

function createNewActionsSharedObservable(): Observable<AgentAction[]> {
  return timer(0, UPDATE_ACTIONS_INTERVAL_MS).pipe(
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

async function createAgentActionFromConfigIfOutdated(
  soClient: SavedObjectsClientContract,
  agent: Agent,
  config: FullAgentConfig | null
) {
  if (!config || !config.revision) {
    return;
  }
  const isAgentConfigOutdated = !agent.config_revision || agent.config_revision < config.revision;
  if (!isAgentConfigOutdated) {
    return;
  }

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

function agentConnectedStateFactory() {
  const connectedAgentsIds = new Set<string>();
  let agentToUpdate = new Set<string>();

  function addAgent(agentId: string) {
    connectedAgentsIds.add(agentId);
    agentToUpdate.add(agentId);
  }

  function removeAgent(agentId: string) {
    connectedAgentsIds.delete(agentId);
  }

  async function wrapPromise<T>(agentId: string, p: Promise<T>): Promise<T> {
    try {
      addAgent(agentId);
      const res = await p;
      removeAgent(agentId);
      return res;
    } catch (err) {
      removeAgent(agentId);
      throw err;
    }
  }

  async function updateLastCheckinAt() {
    if (agentToUpdate.size === 0) {
      return;
    }
    const internalSOClient = getInternalUserSOClient();
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

    agentToUpdate = new Set<string>([...connectedAgentsIds.values()]);
    await internalSOClient.bulkUpdate<AgentSOAttributes>(updates, { refresh: false });
  }

  return {
    wrapPromise,
    updateLastCheckinAt,
  };
}

function agentCheckinStateFactory() {
  const agentConnectedState = agentConnectedStateFactory();

  // Shared Observables
  const agentConfigs$ = new Map<string, Observable<FullAgentConfig | null>>();
  const newActions$ = createNewActionsSharedObservable();

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
      mergeMap((config) => createAgentActionFromConfigIfOutdated(soClient, agent, config)),
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

  function start() {
    setInterval(async () => {
      try {
        await agentConnectedState.updateLastCheckinAt();
      } catch (err) {
        appContextService.getLogger().error(err);
      }
    }, UPDATE_LAST_CHECKIN_INTERVAL_MS);
  }

  return {
    subscribeToNewActions: (
      soClient: SavedObjectsClientContract,
      agent: Agent,
      options?: { signal: AbortSignal }
    ) => agentConnectedState.wrapPromise(agent.id, subscribeToNewActions(soClient, agent, options)),
    start,
  };
}

export const agentCheckinState = agentCheckinStateFactory();

agentCheckinState.start();
