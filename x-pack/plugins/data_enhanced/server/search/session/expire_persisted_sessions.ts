/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, Observable } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import {
  nodeBuilder,
  SEARCH_SESSION_TYPE,
  SearchSessionStatus,
  KueryNode,
} from '@kbn/data-plugin/common';
import { checkSearchSessionsByPage, getSearchSessionsPage$ } from './get_search_session_page';
import { SearchSessionsConfig, CheckSearchSessionsDeps, SearchSessionsResponse } from './types';
import { bulkUpdateSessions, getAllSessionsStatusUpdates } from './update_session_status';

export const SEARCH_SESSIONS_EXPIRE_TASK_TYPE = 'search_sessions_expire';
export const SEARCH_SESSIONS_EXPIRE_TASK_ID = `data_enhanced_${SEARCH_SESSIONS_EXPIRE_TASK_TYPE}`;

function checkSessionExpirationPage(
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfig,
  filter: KueryNode,
  page: number
): Observable<SearchSessionsResponse> {
  const { logger } = deps;
  logger.debug(`${SEARCH_SESSIONS_EXPIRE_TASK_TYPE} Fetching sessions from page ${page}`);
  return getSearchSessionsPage$(deps, filter, config.pageSize, page).pipe(
    concatMap(async (searchSessions) => {
      if (!searchSessions.total) return searchSessions;

      logger.debug(
        `${SEARCH_SESSIONS_EXPIRE_TASK_TYPE} Found ${searchSessions.total} sessions, processing ${searchSessions.saved_objects.length}`
      );

      const updatedSessions = await getAllSessionsStatusUpdates(deps, config, searchSessions);
      await bulkUpdateSessions(deps, updatedSessions);

      return searchSessions;
    })
  );
}

export function checkPersistedCompletedSessionExpiration(
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfig
) {
  const { logger } = deps;

  const persistedSessionsFilter = nodeBuilder.and([
    nodeBuilder.is(`${SEARCH_SESSION_TYPE}.attributes.persisted`, 'true'),
    nodeBuilder.is(
      `${SEARCH_SESSION_TYPE}.attributes.status`,
      SearchSessionStatus.COMPLETE.toString()
    ),
  ]);

  return checkSearchSessionsByPage(
    checkSessionExpirationPage,
    deps,
    config,
    persistedSessionsFilter
  ).pipe(
    catchError((e) => {
      logger.error(
        `${SEARCH_SESSIONS_EXPIRE_TASK_TYPE} Error while processing sessions: ${e?.message}`
      );
      return EMPTY;
    })
  );
}
