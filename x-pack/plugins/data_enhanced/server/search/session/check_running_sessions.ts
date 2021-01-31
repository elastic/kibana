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
import moment from 'moment';
import { nodeBuilder } from '../../../../../../src/plugins/data/common';
import {
  SearchSessionStatus,
  SearchSessionSavedObjectAttributes,
  SearchSessionRequestInfo,
  SEARCH_SESSION_TYPE,
  ENHANCED_ES_SEARCH_STRATEGY,
} from '../../../common';
import { getSearchStatus } from './get_search_status';
import { getSessionStatus } from './get_session_status';
import { SearchSessionsConfig, SearchStatus } from './types';

export interface CheckRunningSessionsDeps {
  savedObjectsClient: SavedObjectsClientContract;
  client: ElasticsearchClient;
  logger: Logger;
}

function isSessionStale(
  session: SavedObjectsFindResult<SearchSessionSavedObjectAttributes>,
  config: SearchSessionsConfig,
  logger: Logger
) {
  const curTime = moment();
  // Delete if a running session wasn't polled for in the last notTouchedTimeout OR if a completed session wasn't saved for within onScreenTicompletedTimeoutmeout
  return (
    (session.attributes.status === SearchSessionStatus.IN_PROGRESS &&
      curTime.diff(moment(session.attributes.touched), 'ms') >
        config.notTouchedTimeout.asMilliseconds()) ||
    curTime.diff(moment(session.attributes.created), 'ms') >
      config.completedTimeout.asMilliseconds()
  );
}

async function updateSessionStatus(
  session: SavedObjectsFindResult<SearchSessionSavedObjectAttributes>,
  client: ElasticsearchClient,
  logger: Logger
) {
  let sessionUpdated = false;

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

          if (currentStatus.status !== searchInfo.status) {
            logger.debug(`search ${searchInfo.id} | status changed to ${currentStatus.status}`);
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
  if (sessionStatus !== session.attributes.status) {
    session.attributes.status = sessionStatus;
    sessionUpdated = true;
  }

  return sessionUpdated;
}

export async function checkRunningSessions(
  { savedObjectsClient, client, logger }: CheckRunningSessionsDeps,
  config: SearchSessionsConfig
): Promise<void> {
  try {
    // TODO: take care of pagination
    const runningSearchSessionsResponse = await savedObjectsClient.find<SearchSessionSavedObjectAttributes>(
      {
        perPage: config.pageSize,
        type: SEARCH_SESSION_TYPE,
        namespaces: ['*'],
        filter: nodeBuilder.or([
          nodeBuilder.and([
            nodeBuilder.is(
              `${SEARCH_SESSION_TYPE}.attributes.status`,
              SearchSessionStatus.IN_PROGRESS.toString()
            ),
            nodeBuilder.is(`${SEARCH_SESSION_TYPE}.attributes.persisted`, 'true'),
          ]),
          nodeBuilder.is(`${SEARCH_SESSION_TYPE}.attributes.persisted`, 'false'),
        ]),
      }
    );

    if (!runningSearchSessionsResponse.total) return;

    logger.debug(`Found ${runningSearchSessionsResponse.total} running sessions`);

    const updatedSessions = new Array<SavedObjectsFindResult<SearchSessionSavedObjectAttributes>>();

    await Promise.all(
      runningSearchSessionsResponse.saved_objects.map(async (session) => {
        const updated = await updateSessionStatus(session, client, logger);
        let deleted = false;

        if (!session.attributes.persisted) {
          if (isSessionStale(session, config, logger)) {
            deleted = true;
            // delete saved object to free up memory
            // TODO: there's a potential rare edge case of deleting an object and then receiving a new trackId for that same session!
            // Maybe we want to change state to deleted and cleanup later?
            logger.debug(`Deleting stale session | ${session.id}`);
            await savedObjectsClient.delete(SEARCH_SESSION_TYPE, session.id);

            // Send a delete request for each async search to ES
            Object.keys(session.attributes.idMapping).map(async (searchKey: string) => {
              const searchInfo = session.attributes.idMapping[searchKey];
              if (searchInfo.strategy === ENHANCED_ES_SEARCH_STRATEGY) {
                try {
                  await client.asyncSearch.delete({ id: searchInfo.id });
                } catch (e) {
                  logger.debug(
                    `Error ignored while deleting async_search ${searchInfo.id}: ${e.message}`
                  );
                }
              }
            });
          }
        }

        if (updated && !deleted) {
          updatedSessions.push(session);
        }
      })
    );

    // Do a bulk update
    if (updatedSessions.length) {
      // If there's an error, we'll try again in the next iteration, so there's no need to check the output.
      const updatedResponse = await savedObjectsClient.bulkUpdate<SearchSessionSavedObjectAttributes>(
        updatedSessions
      );
      logger.debug(`Updated ${updatedResponse.saved_objects.length} search sessions`);
    }
  } catch (err) {
    logger.error(err);
  }
}
