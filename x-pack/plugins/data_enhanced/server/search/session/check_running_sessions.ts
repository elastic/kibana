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
  SearchSessionStatus,
  SearchSessionSavedObjectAttributes,
  SearchSessionRequestInfo,
} from '../../../common';
import { SEARCH_SESSION_TYPE } from '../../saved_objects';
import { getSearchStatus } from './get_search_status';
import { getSessionStatus } from './get_session_status';
import { SearchStatus } from './types';

export async function checkRunningSessions(
  savedObjectsClient: SavedObjectsClientContract,
  client: ElasticsearchClient,
  logger: Logger
): Promise<void> {
  try {
    const runningSearchSessionsResponse = await savedObjectsClient.find<SearchSessionSavedObjectAttributes>(
      {
        type: SEARCH_SESSION_TYPE,
        search: SearchSessionStatus.IN_PROGRESS.toString(),
        searchFields: ['status'],
        namespaces: ['*'],
      }
    );

    if (!runningSearchSessionsResponse.total) return;

    logger.debug(`Found ${runningSearchSessionsResponse.total} running sessions`);

    const updatedSessions = new Array<SavedObjectsFindResult<SearchSessionSavedObjectAttributes>>();

    let sessionUpdated = false;

    await Promise.all(
      runningSearchSessionsResponse.saved_objects.map(async (session) => {
        // Check statuses of all running searches
        await Promise.all(
          Object.keys(session.attributes.idMapping).map(async (searchKey: string) => {
            const updateSearchRequest = (
              currentStatus: Pick<SearchSessionRequestInfo, 'status' | 'error'>
            ) => {
              sessionUpdated = true;
              session.attributes.idMapping[searchKey] = {
                ...session.attributes.idMapping[searchKey],
                ...currentStatus,
              };
            };

            const searchInfo = session.attributes.idMapping[searchKey];
            if (searchInfo.status === SearchStatus.IN_PROGRESS) {
              try {
                const currentStatus = await getSearchStatus(client, searchInfo.id);

                if (currentStatus.status !== SearchStatus.IN_PROGRESS) {
                  updateSearchRequest(currentStatus);
                }
              } catch (e) {
                logger.error(e);
                updateSearchRequest({
                  status: SearchStatus.ERROR,
                  error: e.message || e.meta.error?.caused_by?.reason,
                });
              }
            }
          })
        );

        // And only then derive the session's status
        const sessionStatus = getSessionStatus(session.attributes);
        if (sessionStatus !== SearchSessionStatus.IN_PROGRESS) {
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
      const updatedResponse = await savedObjectsClient.bulkUpdate<SearchSessionSavedObjectAttributes>(
        updatedSessions
      );
      logger.debug(`Updated ${updatedResponse.saved_objects.length} background sessions`);
    }
  } catch (err) {
    logger.error(err);
  }
}
