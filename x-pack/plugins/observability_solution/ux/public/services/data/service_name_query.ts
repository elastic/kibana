/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { mergeProjection } from '../../../common/utils/merge_projection';
import { SetupUX, UxUIFilters } from '../../../typings/ui_filters';
import { getRumPageLoadTransactionsProjection } from './projections';

export function serviceNameQuery(start: number, end: number, uiFilters?: UxUIFilters) {
  const setup: SetupUX = { uiFilters: uiFilters ? uiFilters : {} };
  const projection = getRumPageLoadTransactionsProjection({
    setup,
    start,
    end,
  });
  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: projection.body.query.bool,
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 1000,
          },
        },
      },
    },
  });

  return params;
}
