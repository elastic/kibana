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
import { BackgroundSessionStatus, BackgroundSessionSavedObjectAttributes } from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import { getSearchStatus } from './get_search_status';
import { getSessionStatus } from './get_session_status';
import { SearchStatus } from './types';

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

    let sessionUpdated = false;

    await Promise.all(
      runningBackgroundSearchesResponse.saved_objects.map(async (session) => {
        // Check statuses of all running searches
        await Promise.all(
          Object.keys(session.attributes.idMapping).map(async (searchKey: string) => {
            const searchInfo = session.attributes.idMapping[searchKey];
            if (searchInfo.status === SearchStatus.IN_PROGRESS) {
              const currentStatus = await getSearchStatus(client, searchInfo.strategy);

              if (currentStatus.status !== SearchStatus.IN_PROGRESS) {
                sessionUpdated = true;
                session.attributes.idMapping[searchKey] = {
                  ...session.attributes.idMapping[searchKey],
                  ...currentStatus,
                };
              }
            }
          })
        );

        // And only then derive the session's status
        const sessionStatus = getSessionStatus(session.attributes);
        if (sessionStatus !== BackgroundSessionStatus.IN_PROGRESS) {
          session.attributes.status = sessionStatus;
          sessionUpdated = true;
        }

        if (sessionUpdated) {
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
