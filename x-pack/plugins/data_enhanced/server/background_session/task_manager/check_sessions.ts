/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient, Logger, SavedObject, APICaller } from 'kibana/server';
import { BackgroundSessionStatus, BackgroundSessionSavedObjectAttributes } from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '..';

async function checkAsyncId(caller: APICaller, logger: Logger, asyncId: string) {
  try {
    const method = 'GET';
    const path = encodeURI(`/_async_search/${asyncId}`);
    const response = await caller('transport.request', { method, path }, {});

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
  caller: APICaller
): Promise<void> {
  try {
    const runningBackgroundSearchesResponse = await savedObjectsClient.find({
      type: BACKGROUND_SESSION_TYPE,
      search: BackgroundSessionStatus.Running.toString(),
      searchFields: ['status'],
    });

    const runningBackgroundSearches = runningBackgroundSearchesResponse.saved_objects as Array<
      SavedObject<BackgroundSessionSavedObjectAttributes>
    >;

    runningBackgroundSearches.map((backgroundSearch) => {
      const searchIds = Object.keys(backgroundSearch.attributes.idMapping);
      searchIds.map((searchId: string) => {
        checkAsyncId(caller, logger, searchId);
        logger.debug(searchId);
      });
    });

    logger.debug(`Got ${runningBackgroundSearchesResponse.total} running background sessios`);
  } catch (err) {
    return;
  }
}
