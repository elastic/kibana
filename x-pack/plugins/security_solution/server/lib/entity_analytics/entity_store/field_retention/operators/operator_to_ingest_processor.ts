/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { FieldRetentionOperator } from './types';
import { preferNewestValueProcessor } from './prefer_newest_value';
import { preferOldestValueProcessor } from './prefer_oldest_value';
import { collectValuesProcessor } from './collect_values';

export const fieldOperatorToIngestProcessor = (
  fieldOperator: FieldRetentionOperator
): IngestProcessorContainer => {
  switch (fieldOperator.operation) {
    case 'prefer_newest_value':
      return preferNewestValueProcessor(fieldOperator);
    case 'prefer_oldest_value':
      return preferOldestValueProcessor(fieldOperator);
    case 'collect_values':
      return collectValuesProcessor(fieldOperator);
  }
};
