/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels } from '../constants/constants';
import { buildPhraseFilter } from '../utils';
import { TRANSACTION_DURATION } from '../constants/elasticsearch_fieldnames';

export function getServiceThroughputLensConfig({
  seriesId,
  indexPattern,
}: ConfigProps): DataSeries {
  return {
    id: seriesId,
    reportType: 'service-throughput',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        operationType: 'average',
        sourceField: 'transaction.duration.us',
        label: 'Throughput',
      },
    ],
    hasOperationType: true,
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
    filters: buildPhraseFilter('transaction.type', 'request', indexPattern),
    labels: { ...FieldLabels, [TRANSACTION_DURATION]: 'Throughput' },
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
