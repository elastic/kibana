/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSeries } from '../types';

export function getServiceLatencyLensConfig(): DataSeries {
  return {
    name: 'elastic.co',
    id: 'elastic-co',
    dataViewType: 'service-latency',
    defaultSeriesType: 'line',
    indexPattern: 'apm_static_index_pattern_id',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumn: {
      operationType: 'avg',
      sourceField: 'transaction.duration.us',
      label: 'Latency',
    },
    defaultFilters: [
      'user_agent.name',
      'user_agent.os.name',
      'client.geo.country_name',
      'user_agent.device.name',
    ],
    breakdowns: [
      'user_agent.name',
      'user_agent.os.name',
      'client.geo.country_name',
      'user_agent.device.name',
    ],
    filters: {
      query: { match_phrase: { 'transaction.type': 'request' } },
    },
  };
}
