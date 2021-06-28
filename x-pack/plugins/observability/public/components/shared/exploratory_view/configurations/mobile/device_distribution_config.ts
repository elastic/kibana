/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import { FieldLabels, USE_BREAK_DOWN_COLUMN } from '../constants';
import { buildPhraseFilter } from '../utils';
import { SERVICE_NAME } from '../constants/elasticsearch_fieldnames';
import { MOBILE_APP, NUMBER_OF_DEVICES } from '../constants/labels';
import { MobileFields } from './mobile_fields';

export function getMobileDeviceDistributionConfig({ indexPattern }: ConfigProps): SeriesConfig {
  return {
    reportType: 'device-data-distribution',
    defaultSeriesType: 'bar',
    seriesTypes: ['bar', 'bar_horizontal'],
    xAxisColumn: {
      sourceField: USE_BREAK_DOWN_COLUMN,
    },
    yAxisColumns: [
      {
        sourceField: 'labels.device_id',
        operationType: 'unique_count',
        label: NUMBER_OF_DEVICES,
      },
    ],
    hasOperationType: false,
    filterFields: Object.keys(MobileFields),
    breakdownFields: Object.keys(MobileFields),
    baseFilters: [
      ...buildPhraseFilter('agent.name', 'iOS/swift', indexPattern),
      ...buildPhraseFilter('processor.event', 'transaction', indexPattern),
    ],
    labels: {
      ...FieldLabels,
      ...MobileFields,
      [SERVICE_NAME]: MOBILE_APP,
    },
    definitionFields: [SERVICE_NAME],
  };
}
