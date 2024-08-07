/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamType, QualityIndicators } from './types';

export const DATASET_QUALITY_APP_ID = 'dataset_quality';
export const DEFAULT_DATASET_TYPE: DataStreamType = 'logs';
export const DEFAULT_LOGS_DATA_VIEW = 'logs-*-*';

export const POOR_QUALITY_MINIMUM_PERCENTAGE = 3;
export const DEGRADED_QUALITY_MINIMUM_PERCENTAGE = 0;

export const DEFAULT_SORT_FIELD = 'title';
export const DEFAULT_SORT_DIRECTION = 'asc';

export const DEFAULT_DEGRADED_FIELD_SORT_FIELD = 'count';
export const DEFAULT_DEGRADED_FIELD_SORT_DIRECTION = 'desc';

export const NONE = 'none';

export const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' };
export const DEFAULT_DATEPICKER_REFRESH = { value: 60000, pause: false };

export const DEFAULT_DEGRADED_DOCS = {
  percentage: 0,
  count: 0,
  docsCount: 0,
  quality: 'good' as QualityIndicators,
};

export const NUMBER_FORMAT = '0,0.[000]';
export const BYTE_NUMBER_FORMAT = '0.0 b';

export const MAX_HOSTS_METRIC_VALUE = 50;

export const MAX_DEGRADED_FIELDS = 1000;

export const MASKED_FIELD_PLACEHOLDER = '<custom field>';
export const UNKOWN_FIELD_PLACEHOLDER = '<unkwon>';

export const KNOWN_TYPES: DataStreamType[] = ['logs', 'metrics', 'traces'];
