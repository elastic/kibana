/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMissingBucketConfig } from './use_pivot_config';
import { PIVOT_SUPPORTED_GROUP_BY_AGGS, PivotGroupByConfig } from '../../../../../common';

const groupByTerms: PivotGroupByConfig = {
  agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
  field: 'the-group-by-field',
  aggName: 'the-group-by-agg-name',
  dropDownName: 'the-group-by-drop-down-name',
};

describe('usePivotConfig', () => {
  test('getMissingBucketConfig()', () => {
    expect(getMissingBucketConfig(groupByTerms)).toEqual({});
    expect(getMissingBucketConfig({ ...groupByTerms, ...{ missing_bucket: true } })).toEqual({
      missing_bucket: true,
    });
    expect(getMissingBucketConfig({ ...groupByTerms, ...{ missing_bucket: false } })).toEqual({
      missing_bucket: false,
    });
  });
});
