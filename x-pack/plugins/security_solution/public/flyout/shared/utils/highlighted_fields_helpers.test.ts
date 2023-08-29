/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertHighlightedFieldsToPrevalenceFilters,
  convertHighlightedFieldsToTableRow,
} from './highlighted_fields_helpers';

const scopeId = 'scopeId';

describe('convertHighlightedFieldsToTableRow', () => {
  it('should convert highlighted fields to a table row', () => {
    const highlightedFields = {
      'host.name': {
        values: ['host-1'],
      },
    };
    expect(convertHighlightedFieldsToTableRow(highlightedFields, scopeId)).toEqual([
      {
        field: 'host.name',
        description: {
          field: 'host.name',
          values: ['host-1'],
          scopeId: 'scopeId',
        },
      },
    ]);
  });

  it('should convert take override name over default name', () => {
    const highlightedFields = {
      'host.name': {
        overrideField: 'host.name-override',
        values: ['host-1'],
      },
    };
    expect(convertHighlightedFieldsToTableRow(highlightedFields, scopeId)).toEqual([
      {
        field: 'host.name-override',
        description: {
          field: 'host.name-override',
          values: ['host-1'],
          scopeId: 'scopeId',
        },
      },
    ]);
  });
});

describe('convertHighlightedFieldsToPrevalenceFilters', () => {
  it('should convert highlighted fields to prevalence filters', () => {
    const highlightedFields = {
      'host.name': {
        values: ['host-1'],
      },
      'user.name': {
        values: ['user-1'],
      },
    };
    expect(convertHighlightedFieldsToPrevalenceFilters(highlightedFields)).toEqual({
      'host.name': { match: { 'host.name': 'host-1' } },
      'user.name': { match: { 'user.name': 'user-1' } },
    });
  });
});
