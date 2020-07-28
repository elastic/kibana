/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { get } from 'lodash';
import { ES_SCROLL_SETTINGS } from '../../../common/constants';

export function fetchAllFromScroll(
  searchResuls: any,
  dataClient: ILegacyScopedClusterClient,
  hits: any[] = []
): Promise<any> {
  const newHits = get(searchResuls, 'hits.hits', []);
  const scrollId = get(searchResuls, '_scroll_id');

  if (newHits.length > 0) {
    hits.push(...newHits);

    return dataClient
      .callAsCurrentUser('scroll', {
        body: {
          scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
          scroll_id: scrollId,
        },
      })
      .then((innerResponse: any) => {
        return fetchAllFromScroll(innerResponse, dataClient, hits);
      });
  }

  return Promise.resolve(hits);
}
