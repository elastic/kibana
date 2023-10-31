/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TermsIndexPatternColumn } from '../operations';
import type { FormBasedLayer } from '../types';
import { isLayerChangingDueToOtherBucketChange } from './dimensions_editor_helpers';

describe('isLayerChangingDueToOtherBucketChange', () => {
  function getLayer(otherBucket: boolean, size: number) {
    return {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          sourceField: 'source',
          params: {
            size,
            orderDirection: 'asc',
            otherBucket,
            orderBy: {
              type: 'alphabetical',
            },
          },
        } as TermsIndexPatternColumn,
        col2: {
          label: 'My Op',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'memory',
        },
      },
    } as FormBasedLayer;
  }

  it('should return true if it changes programatically from size smaller to 1000 to a greater one', () => {
    const prevLayer = getLayer(true, 5);
    const newLayer = getLayer(false, 1000);
    expect(isLayerChangingDueToOtherBucketChange(prevLayer, newLayer)).toBeTruthy();
  });

  it('should return false if it changes from size smaller to 1000 to another smaller than 1000', () => {
    const prevLayer = getLayer(true, 5);
    const newLayer = getLayer(true, 999);
    expect(isLayerChangingDueToOtherBucketChange(prevLayer, newLayer)).toBeFalsy();
  });

  it('should return false if it changes from size greater than 1000 to another smaller than 1000', () => {
    const prevLayer = getLayer(false, 1001);
    const newLayer = getLayer(true, 4);
    expect(isLayerChangingDueToOtherBucketChange(prevLayer, newLayer)).toBeFalsy();
  });
});
