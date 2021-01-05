/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Logger,
  ElasticsearchClient,
  SavedObjectsFindResult,
  SavedObjectsClientContract,
} from 'kibana/server';
import {
  BackgroundSessionStatus,
  BackgroundSessionSavedObjectAttributes,
  BackgroundSessionSearchInfo,
} from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import { getSearchStatus } from './get_search_status';
import { getSessionStatus } from './get_session_status';

export async function checkRunningSessions(
  savedObjectsClient: SavedObjectsClientContract,
  client: ElasticsearchClient,
  logger: Logger
): Promise<void> {
  try {
    const runningBackgroundSearchesResponse = await savedObjectsClient.find<BackgroundSessionSavedObjectAttributes>(
      {
        type: BACKGROUND_SESSION_TYPE,
        search: BackgroundSessionStatus.IN_PROGRESS.toString(),
        searchFields: ['status'],
        namespaces: ['*'],
      }
    );

    if (!runningBackgroundSearchesResponse.total) return;

    logger.debug(`Found ${runningBackgroundSearchesResponse.total} running sessions`);

    const updatedSessions = new Array<
      SavedObjectsFindResult<BackgroundSessionSavedObjectAttributes>
    >();

    await Promise.all(
      runningBackgroundSearchesResponse.saved_objects.map(async (session) => {
        const searchIds = Object.values(session.attributes.idMapping);
        const searchStatuses = await Promise.all(
          searchIds.map(async (sessionInfo: BackgroundSessionSearchInfo) => {
            return await getSearchStatus(client, sessionInfo.strategy);
          })
        );

        const sessionStatus = getSessionStatus(searchStatuses);
        if (sessionStatus !== BackgroundSessionStatus.IN_PROGRESS) {
          session.attributes.status = sessionStatus;
          const firstError = searchStatuses.filter((searchInfo) => searchInfo.status === undefined);
          session.attributes.error = firstError.length ? firstError[0].error : undefined;
          updatedSessions.push(session);
        }
      })
    );

    if (updatedSessions.length) {
      // If there's an error, we'll try again in the next iteration, so there's no need to check the output.
      const updatedResponse = await savedObjectsClient.bulkUpdate<BackgroundSessionSavedObjectAttributes>(
        updatedSessions
      );
      logger.debug(`Updated ${updatedResponse.saved_objects.length} background sessions`);
    }
  } catch (err) {
    logger.error(err);
  }
}
