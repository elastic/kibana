/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canGroupBy } from './group_by_field';

describe('canGroupBy', () => {
  it('handles multi fields where there are multi es types', () => {
    const field = {
      name: 'event.action.keyword',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
      metadata_field: false,
      subType: {
        multi: {
          parent: 'event.action',
        },
      },
      isMapped: true,
      shortDotsEnable: false,
    };
    expect(canGroupBy(field)).toBe(true);
    const field2 = {
      name: 'event.action',
      type: 'string',
      esTypes: ['keyword', 'text'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
      metadata_field: false,
      isMapped: true,
      shortDotsEnable: false,
    };
    expect(canGroupBy(field2)).toBe(false);
  });

  it('handles date fields', () => {
    const field = {
      name: '@timestamp',
      type: 'date',
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
      metadata_field: false,
      isMapped: true,
      shortDotsEnable: false,
    };
    expect(canGroupBy(field)).toBe(false);
  });

  it('handles non aggregatable fields', () => {
    const field = {
      name: 'event.action',
      type: 'string',
      esTypes: ['text'],
      searchable: true,
      aggregatable: false,
      readFromDocValues: true,
      metadata_field: false,
      isMapped: true,
      shortDotsEnable: false,
    };

    expect(canGroupBy(field)).toBe(false);
  });
});
