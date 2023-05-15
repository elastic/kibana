/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WatcherQueryWatch,
  WatcherQueryWatchesResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core/server';
import { get } from 'lodash';
import { ES_SEARCH_AFTER_SETTINGS } from '../../../common/constants/es_search_after_settings';

export const fetchAllWatches = async (
  dataClient: IScopedClusterClient,
  previousResponse: WatcherQueryWatchesResponse,
  accumulatedHits: WatcherQueryWatch[] = []
): Promise<WatcherQueryWatch[]> => {
  const previousWatches = get(previousResponse, 'watches', []);
  accumulatedHits.push(...previousWatches);
  if (previousWatches.length < ES_SEARCH_AFTER_SETTINGS.PAGE_SIZE) {
    return accumulatedHits;
  }

  const lastSortValue: any = get(
    previousWatches[previousWatches.length - 1],
    ES_SEARCH_AFTER_SETTINGS.SORT_FIELD,
    ''
  );

  const response = await dataClient.asCurrentUser.watcher.queryWatches({
    size: ES_SEARCH_AFTER_SETTINGS.PAGE_SIZE,
    sort: ES_SEARCH_AFTER_SETTINGS.SORT,
    search_after: [lastSortValue],
  });

  return fetchAllWatches(dataClient, response, accumulatedHits);
};
