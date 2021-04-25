/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from 'kibana/server';
import moment from 'moment';
import { EMPTY, from, Observable } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import {
  nodeBuilder,
  ENHANCED_ES_SEARCH_STRATEGY,
  SEARCH_SESSION_TYPE,
  SearchSessionRequestInfo,
  SearchSessionSavedObjectAttributes,
  SearchSessionStatus,
} from '../../../../../../src/plugins/data/common';
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
  // Delete if a running session wasn't polled for in the last notTouchedInProgressTimeout OR
  // if a completed \ errored \ canceled session wasn't saved for within notTouchedTimeout
  return (
    (session.attributes.status === SearchSessionStatus.IN_PROGRESS &&
      curTime.diff(moment(session.attributes.touched), 'ms') >
        config.notTouchedInProgressTimeout.asMilliseconds()) ||
    (session.attributes.status !== SearchSessionStatus.IN_PROGRESS &&
      curTime.diff(moment(session.attributes.touched), 'ms') >
        config.notTouchedTimeout.asMilliseconds())
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
    const now = new Date().toISOString();
    session.attributes.status = sessionStatus;
    session.attributes.touched = now;
    if (sessionStatus === SearchSessionStatus.COMPLETE) {
      session.attributes.completed = now;
    } else if (session.attributes.completed) {
      session.attributes.completed = null;
    }
    sessionUpdated = true;
  }

  return sessionUpdated;
}

function getSavedSearchSessionsPage$(
  { savedObjectsClient, logger }: CheckRunningSessionsDeps,
  config: SearchSessionsConfig,
  page: number
) {
  logger.debug(`Fetching saved search sessions page ${page}`);
  return from(
    savedObjectsClient.find<SearchSessionSavedObjectAttributes>({
      page,
      perPage: config.pageSize,
      type: SEARCH_SESSION_TYPE,
      namespaces: ['*'],
      // process older sessions first
      sortField: 'touched',
      sortOrder: 'asc',
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
    })
  );
}

function checkRunningSessionsPage(
  deps: CheckRunningSessionsDeps,
  config: SearchSessionsConfig,
  page: number
) {
  const { logger, client, savedObjectsClient } = deps;
  return getSavedSearchSessionsPage$(deps, config, page).pipe(
    concatMap(async (runningSearchSessionsResponse) => {
      if (!runningSearchSessionsResponse.total) return;

      logger.debug(
        `Found ${runningSearchSessionsResponse.total} running sessions, processing ${runningSearchSessionsResponse.saved_objects.length} sessions from page ${page}`
      );

      const updatedSessions = new Array<
        SavedObjectsFindResult<SearchSessionSavedObjectAttributes>
      >();

      await Promise.all(
        runningSearchSessionsResponse.saved_objects.map(async (session) => {
          const updated = await updateSessionStatus(session, client, logger);
          let deleted = false;

          if (!session.attributes.persisted) {
            if (isSessionStale(session, config, logger)) {
              // delete saved object to free up memory
              // TODO: there's a potential rare edge case of deleting an object and then receiving a new trackId for that same session!
              // Maybe we want to change state to deleted and cleanup later?
              logger.debug(`Deleting stale session | ${session.id}`);
              try {
                await savedObjectsClient.delete(SEARCH_SESSION_TYPE, session.id, {
                  namespace: session.namespaces?.[0],
                });
                deleted = true;
              } catch (e) {
                logger.error(
                  `Error while deleting stale search session ${session.id}: ${e.message}`
                );
              }

              // Send a delete request for each async search to ES
              Object.keys(session.attributes.idMapping).map(async (searchKey: string) => {
                const searchInfo = session.attributes.idMapping[searchKey];
                if (searchInfo.strategy === ENHANCED_ES_SEARCH_STRATEGY) {
                  try {
                    await client.asyncSearch.delete({ id: searchInfo.id });
                  } catch (e) {
                    logger.error(
                      `Error while deleting async_search ${searchInfo.id}: ${e.message}`
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
          updatedSessions.map((session) => ({
            ...session,
            namespace: session.namespaces?.[0],
          }))
        );

        const success: Array<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>> = [];
        const fail: Array<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>> = [];

        updatedResponse.saved_objects.forEach((savedObjectResponse) => {
          if ('error' in savedObjectResponse) {
            fail.push(savedObjectResponse);
            logger.error(
              `Error while updating search session ${savedObjectResponse?.id}: ${savedObjectResponse.error?.message}`
            );
          } else {
            success.push(savedObjectResponse);
          }
        });

        logger.debug(`Updating search sessions: success: ${success.length}, fail: ${fail.length}`);
      }

      return runningSearchSessionsResponse;
    })
  );
}

export function checkRunningSessions(deps: CheckRunningSessionsDeps, config: SearchSessionsConfig) {
  const { logger } = deps;

  const checkRunningSessionsByPage = (nextPage = 1): Observable<void> =>
    checkRunningSessionsPage(deps, config, nextPage).pipe(
      concatMap((result) => {
        if (!result || !result.saved_objects || result.saved_objects.length < config.pageSize) {
          return EMPTY;
        } else {
          // TODO: while processing previous page session list might have been changed and we might skip a session,
          // because it would appear now on a different "page".
          // This isn't critical, as we would pick it up on a next task iteration, but maybe we could improve this somehow
          return checkRunningSessionsByPage(result.page + 1);
        }
      })
    );

  return checkRunningSessionsByPage().pipe(
    catchError((e) => {
      logger.error(`Error while processing search sessions: ${e?.message}`);
      return EMPTY;
    })
  );
}
