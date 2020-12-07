/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { tagUsageCollectorSchema } from './schema';
import { taggableTypes } from '../../common/constants';

describe('usage collector schema', () => {
  // this test is there to assert than when a new type is added to `taggableTypes`,
  // it is also added to the usage collector schema.
  it('contains entry for every taggable type', () => {
    const schemaTypes = Object.keys(tagUsageCollectorSchema.types);
    expect(schemaTypes.sort()).toEqual(taggableTypes.sort());
  });
});
