/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import type { SearchEnrichments } from './types';

export const searchEnrichments: SearchEnrichments = async ({ index, services, query }) => {
  try {
    const response = await services.scopedClusterClient.asCurrentUser.search({
      index,
      body: {
        query: getQueryFilter(
          '',
          'kuery',
          [
            {
              ...query,
            },
          ],
          index,
          []
        ),
      },
      track_total_hits: false,
    });

    return response.hits.hits;
  } catch (e) {
    return [];
  }
};
