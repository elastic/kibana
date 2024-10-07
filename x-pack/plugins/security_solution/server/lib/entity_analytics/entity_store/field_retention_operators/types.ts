/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { CollectValues } from './collect_values';
import type { PreferNewestValue } from './prefer_newest_value';
import type { PreferOldestValue } from './prefer_oldest_value';

export interface BaseFieldRetentionOperator {
  field: string;
  operation: string;
}

export interface FieldRetentionOperatorBuilderOptions {
  enrichField: string;
}

export type FieldRetentionOperator = PreferNewestValue | PreferOldestValue | CollectValues;

export type FieldRetentionOperatorBuilder<O extends BaseFieldRetentionOperator> = (
  operator: O,
  options: FieldRetentionOperatorBuilderOptions
) => IngestProcessorContainer;
