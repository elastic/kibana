/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryContainer } from '@elastic/elasticsearch/api/types';
import { DataSeries } from '../types';
import { FieldLabels } from './constants';

interface Props {
  seriesId: string;
}

export function getServiceThroughputLensConfig({ seriesId }: Props): DataSeries {
  return {
    id: seriesId,
    reportType: 'service-latency',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumn: {
      operationType: 'avg',
      sourceField: 'transaction.duration.us',
      label: 'Throughput',
    },
    metricType: true,
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
    filters: [{ query: { match_phrase: { 'transaction.type': 'request' } } } as QueryContainer],
    labels: { ...FieldLabels },
    reportDefinitions: [
      {
        field: 'service.name',
        required: true,
      },
      {
        field: 'service.environment',
      },
    ],
  };
}
