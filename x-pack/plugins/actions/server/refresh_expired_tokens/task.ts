/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  CoreStart,
  SavedObjectsFindResponse,
  KibanaRequest,
  SavedObjectsClientContract,
} from 'kibana/server';
import { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { ActionsConfigurationUtilities, getActionsConfigurationUtilities } from '../actions_config';
import {
  getInitialAccessToken,
  getRefreshAccessToken,
} from '../builtin_action_types/servicenow/get_access_token';
import { ActionsConfig } from '../config';
import { ActionsPluginsStart } from '../plugin';
import { RawAction } from '../types';

const TASK_TYPE = 'actions_refresh_expired_tokens';
export const TASK_ID = `Actions-${TASK_TYPE}`;

export function initializeRefreshExpiredTokens(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, ActionsPluginsStart, unknown]>,
  taskManager: TaskManagerSetupContract,
  config: ActionsConfig
) {
  registerRefreshExpiredTokensTaskDefinition(logger, coreStartServices, taskManager, config);
}

export async function scheduleRefreshExpiredTokensTask(
  logger: Logger,
  config: ActionsConfig,
  taskManager: TaskManagerStartContract
) {
  const interval = config.refreshExpiredTokensTask.interval;
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: {
        interval,
      },
      state: {},
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

function registerRefreshExpiredTokensTaskDefinition(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, ActionsPluginsStart, unknown]>,
  taskManager: TaskManagerSetupContract,
  config: ActionsConfig
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Refresh expired tokens',
      createTaskRunner: taskRunner(logger, coreStartServices, config),
    },
  });
}

function getFakeKibanaRequest(basePath: string) {
  const requestHeaders: Record<string, string> = {};
  return ({
    headers: requestHeaders,
    getBasePath: () => basePath,
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
}

function taskRunner(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, ActionsPluginsStart, unknown]>,
  config: ActionsConfig
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        let totalRefreshed = 0;
        try {
          const [{ savedObjects, http }, { encryptedSavedObjects }] = await coreStartServices;
          const savedObjectsClient = savedObjects.getScopedClient(
            getFakeKibanaRequest(http.basePath.serverBasePath),
            {
              includedHiddenTypes: ['action'],
              excludedWrappers: ['security'],
            }
          );
          const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
            includedHiddenTypes: ['action'],
          });
          const configurationUtilities = getActionsConfigurationUtilities(config);

          let hasPendingToRefresh = true;
          const PAGE_SIZE = 100;
          do {
            const connectors = await savedObjectsClient.find<RawAction>({
              type: 'action',
              filter: `action.attributes.actionTypeId:(.servicenow)`,
              page: 1,
              perPage: PAGE_SIZE,
            });
            totalRefreshed += await refreshExpiredTokens(
              logger,
              configurationUtilities,
              savedObjectsClient,
              connectors,
              encryptedSavedObjectsClient
            );

            hasPendingToRefresh = connectors.total > PAGE_SIZE;
          } while (hasPendingToRefresh);

          return {
            state: {
              runs: (state.runs || 0) + 1,
              total_refreshed: totalRefreshed,
            },
            schedule: {
              interval: config.refreshExpiredTokensTask.interval,
            },
          };
        } catch (e) {
          logger.warn(`Error executing actions refresh expired tokens task: ${e.message}`);
          return {
            state: {
              runs: (state.runs || 0) + 1,
              total_refreshed: totalRefreshed,
            },
            schedule: {
              interval: config.refreshExpiredTokensTask.interval,
            },
          };
        }
      },
    };
  };
}

async function refreshExpiredTokens(
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  savedObjectsClient: SavedObjectsClientContract,
  connectors: SavedObjectsFindResponse<RawAction>,
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient
) {
  let totalUpdated = 0;
  const connectorsToUpdate = connectors.saved_objects.filter(
    (connector) =>
      connector.attributes.config.isOAuth &&
      // no access token yet
      (!connector.attributes.config.expirationDate ||
        // has expired access token
        new Date(connector.attributes.config.expirationDate.toString()) < new Date())
  );
  if (connectorsToUpdate.length > 0) {
    await Promise.all(
      connectorsToUpdate.map(async (connector) => {
        try {
          const decryptedConnector = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
            'action',
            connector.id
          );
          const { clientId, clientSecret, username, password, refreshToken } = decryptedConnector
            .attributes.secrets as Record<string, string>;
          const { apiUrl: url } = connector.attributes.config;
          const urlWithoutTrailingSlash =
            !!url && url.toString().endsWith('/') ? url.toString().slice(0, -1) : url!.toString();

          const tokenResponse = !decryptedConnector.attributes.secrets.accessToken
            ? await getInitialAccessToken(
                logger,
                configurationUtilities,
                clientId,
                clientSecret,
                username,
                password,
                urlWithoutTrailingSlash
              )
            : await getRefreshAccessToken(
                logger,
                configurationUtilities,
                clientId,
                clientSecret,
                refreshToken,
                urlWithoutTrailingSlash
              );
          if (tokenResponse.access_token) {
            await savedObjectsClient.update('action', connector.id, {
              ...connector.attributes,
              config: {
                ...connector.attributes.config,
                expirationDate: new Date(Date.now() + tokenResponse.expires_in).toISOString(),
              },
              secrets: {
                ...decryptedConnector.attributes.secrets,
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
              },
            });
          }

          totalUpdated++;
        } catch (err) {
          logger.error(`Failed to update connector by id "${connector.id}". Error: ${err.message}`);
        }
      })
    );
  }
  logger.debug(`Total updated connectors "${totalUpdated}"`);
  return totalUpdated;
}
