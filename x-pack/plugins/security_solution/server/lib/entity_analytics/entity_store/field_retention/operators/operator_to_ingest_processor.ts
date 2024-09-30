/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRetentionOperator, FieldRetentionOperatorBuilder } from './types';
import { preferNewestValueProcessor } from './prefer_newest_value';
import { preferOldestValueProcessor } from './prefer_oldest_value';
import { collectValuesProcessor } from './collect_values';

/**
 * Converts a field retention operator to an ingest processor.
 * An ingest processor is a step that can be added to an ingest pipeline.
 */
export const fieldOperatorToIngestProcessor: FieldRetentionOperatorBuilder<
  FieldRetentionOperator
> = (fieldOperator, options) => {
  switch (fieldOperator.operation) {
    case 'prefer_newest_value':
      return preferNewestValueProcessor(fieldOperator, options);
    case 'prefer_oldest_value':
      return preferOldestValueProcessor(fieldOperator, options);
    case 'collect_values':
      return collectValuesProcessor(fieldOperator, options);
  }
};
