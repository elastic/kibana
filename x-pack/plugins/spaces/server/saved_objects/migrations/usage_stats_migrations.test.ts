/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { UsageStats } from '../../usage_stats';
import { migrateTo7141 } from './usage_stats_migrations';

const type = 'obj-type';
const id = 'obj-id';

describe('#migrateTo7141', () => {
  it('Resets targeted counter fields and leaves others unchanged', () => {
    const doc = {
      type,
      id,
      attributes: {
        foo: 'bar',
        'apiCalls.copySavedObjects.total': 10,
      },
    } as SavedObjectUnsanitizedDoc<UsageStats>;

    expect(migrateTo7141(doc)).toEqual({
      type,
      id,
      attributes: {
        foo: 'bar',
        'apiCalls.copySavedObjects.total': 0,
        'apiCalls.copySavedObjects.kibanaRequest.yes': 0,
        'apiCalls.copySavedObjects.kibanaRequest.no': 0,
        'apiCalls.copySavedObjects.createNewCopiesEnabled.yes': 0,
        'apiCalls.copySavedObjects.createNewCopiesEnabled.no': 0,
        'apiCalls.copySavedObjects.overwriteEnabled.yes': 0,
        'apiCalls.copySavedObjects.overwriteEnabled.no': 0,
      },
    });
  });
});
