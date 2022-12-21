/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailureMessage } from '../../detections/rules/types';
import { transformCategoryBucket } from './transform_category_bucket';

describe('transform_category_bucket', () => {
  test('it will transform a bucket sent in', () => {
    const result = transformCategoryBucket({
      key: 'test-123',
      doc_count: 10,
    });
    expect(result).toEqual<FailureMessage>({
      message: 'test-123',
      count: 10,
    });
  });
});
