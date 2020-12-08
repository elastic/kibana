/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import {
  SavedObjectsClient,
  Logger,
  ElasticsearchClient,
  SavedObjectsFindResult,
} from 'kibana/server';
import { BackgroundSessionStatus, BackgroundSessionSavedObjectAttributes } from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import { isAsyncSearchStatusResponse } from '../types';

export enum SearchStatus {
  IN_PROGRESS = 'in_progress',
  ERROR = 'error',
  COMPLETE = 'complete',
}

async function checkAsyncId(client: ElasticsearchClient, logger: Logger, asyncId: string) {
  try {
    const path = encodeURI(`/_async_search/status/${asyncId}`);
    const response: ApiResponse<any> = await client.transport.request({
      path,
      method: 'GET',
    });
    if (isAsyncSearchStatusResponse(response)) {
      if ((response.is_partial && !response.is_running) || response.completion_status > 200) {
        return SearchStatus.ERROR;
      } else if (response.is_partial && !response.is_running) {
        return SearchStatus.COMPLETE;
      } else {
        return SearchStatus.IN_PROGRESS;
      }
    } else {
      return SearchStatus.ERROR;
    }
  } catch (e) {
    return SearchStatus.ERROR;
  }
}

async function getSessionStatus(
  searchStatuses: SearchStatus[]
): Promise<BackgroundSessionStatus | undefined> {
  if (searchStatuses.some((item) => item === SearchStatus.ERROR)) {
    return BackgroundSessionStatus.ERROR;
  } else if (searchStatuses.every((item) => item === SearchStatus.COMPLETE)) {
    return BackgroundSessionStatus.COMPLETE;
  } else {
    // Still running
    return undefined;
  }
}

export async function checkBackgoundSessions(
  savedObjectsClient: SavedObjectsClient,
  logger: Logger,
  client: ElasticsearchClient
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

    logger.debug(`Found ${runningBackgroundSearchesResponse.total} running sessios`);

    const updatedSessions = new Array<
      SavedObjectsFindResult<BackgroundSessionSavedObjectAttributes>
    >();

    await Promise.all(
      runningBackgroundSearchesResponse.saved_objects.map(async (session) => {
        const searchIds = Object.values(session.attributes.idMapping);
        const searchStatuses = await Promise.all(
          searchIds.map(async (searchId: string) => {
            return await checkAsyncId(client, logger, searchId);
          })
        );

        const sessionStatus = await getSessionStatus(searchStatuses);
        if (sessionStatus) {
          session.attributes.status = sessionStatus;
          updatedSessions.push(session);
        }
      })
    );

    if (updatedSessions.length) {
      // If there's an error, we'll try again in the next iteration
      const updatedResponse = await savedObjectsClient.bulkUpdate<BackgroundSessionSavedObjectAttributes>(
        updatedSessions
      );
      logger.debug(`Updated ${updatedResponse.saved_objects.length} background sessios`);
    }
  } catch (err) {
    logger.error(err);
    return;
  }
}
