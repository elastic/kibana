/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, DataSeries } from '../../types';
import { FieldLabels } from '../constants';
import { buildPhraseFilter } from '../utils';
import { SERVICE_NAME, TRANSACTION_DURATION } from '../constants/elasticsearch_fieldnames';

export function getResponseDurationLensConfig({ seriesId, indexPattern }: ConfigProps): DataSeries {
  return {
    id: seriesId,
    reportType: 'service-latency',
    defaultSeriesType: 'line',
    seriesTypes: ['line', 'bar'],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        operationType: 'average',
        sourceField: 'transaction.duration.us',
        label: 'Latency',
      },
    ],
    hasOperationType: true,
    defaultFilters: [
      'labels.net_connection_carrier_name',
      'labels.device_model',
      'labels.net_connection_type',
      'host.os.platform',
      'host.os.full',
      'service.version',
    ],
    breakdowns: [
      'labels.net_connection_carrier_name',
      'labels.device_model',
      'labels.net_connection_type',
      'host.os.platform',
      'host.os.full',
      'service.version',
      'labels.net_connection_carrier_isoCountryCode',
    ],
    filters: [
      ...buildPhraseFilter('transaction.type', 'request', indexPattern),
      ...buildPhraseFilter('agent.name', 'iOS/swift', indexPattern),
    ],
    labels: {
      ...FieldLabels,
      [TRANSACTION_DURATION]: 'Response time',
      [SERVICE_NAME]: 'Mobile app',
    },
    reportDefinitions: [
      {
        field: 'service.name',
        required: true,
      },
    ],
  };
}
