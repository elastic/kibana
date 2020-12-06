/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient, Logger, ElasticsearchClient } from 'kibana/server';
import { BackgroundSessionStatus, BackgroundSessionSavedObjectAttributes } from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';

async function checkAsyncId(client: ElasticsearchClient, logger: Logger, asyncId: string) {
  try {
      client.asyncSearch.
    const method = 'GET';
    const path = encodeURI(`/_async_search/status/${asyncId}`);
    const response = await client.transport('transport.request', { method, path }, {});

    logger.debug(
      `${asyncId}, ${response.id}, partial? ${response.is_partial}, running? ${response.is_running}`
    );
  } catch (e) {
    logger.error(e);
  }
}

export async function checkBackgoundSessions(
  savedObjectsClient: SavedObjectsClient,
  logger: Logger,
  client: ElasticsearchClient
): Promise<void> {
  try {
    const runningBackgroundSearchesResponse = await savedObjectsClient.find<BackgroundSessionSavedObjectAttributes>({
      type: BACKGROUND_SESSION_TYPE,
      search: BackgroundSessionStatus.IN_PROGRESS.toString(),
      searchFields: ['status'],
      namespaces: ['*'],
    });

    runningBackgroundSearchesResponse.saved_objects.map((backgroundSearch) => {
      const searchIds = Object.keys(backgroundSearch.attributes.idMapping);
      searchIds.map((searchId: string) => {
        checkAsyncId(client, logger, searchId);
        logger.debug(searchId);
      });
    });

    logger.debug(`Got ${runningBackgroundSearchesResponse.total} running background sessios`);
  } catch (err) {
    return;
  }
}