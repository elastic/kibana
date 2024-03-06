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
const isPreview = false;

describe('convertHighlightedFieldsToTableRow', () => {
  it('should convert highlighted fields to a table row', () => {
    const highlightedFields = {
      'host.name': {
        values: ['host-1'],
      },
    };
    expect(convertHighlightedFieldsToTableRow(highlightedFields, scopeId, isPreview)).toEqual([
      {
        field: 'host.name',
        description: {
          field: 'host.name',
          values: ['host-1'],
          scopeId: 'scopeId',
          isPreview,
        },
      },
    ]);
  });

  it('should convert take override name over default name and use original values if not present in the override', () => {
    const highlightedFields = {
      'host.name': {
        overrideField: { field: 'host.name-override', values: [] },
        values: ['host-1'],
      },
    };
    expect(convertHighlightedFieldsToTableRow(highlightedFields, scopeId, isPreview)).toEqual([
      {
        field: 'host.name-override',
        description: {
          field: 'host.name-override',
          originalField: 'host.name',
          values: ['host-1'],
          scopeId: 'scopeId',
          isPreview,
        },
      },
    ]);
  });

  it('should convert take override name over default name and use provided values', () => {
    const highlightedFields = {
      'host.name': {
        overrideField: { field: 'host.name-override', values: ['value override!'] },
        values: ['host-1'],
      },
    };
    expect(convertHighlightedFieldsToTableRow(highlightedFields, scopeId, isPreview)).toEqual([
      {
        field: 'host.name-override',
        description: {
          field: 'host.name-override',
          originalField: 'host.name',
          values: ['value override!'],
          scopeId: 'scopeId',
          isPreview,
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
        values: ['user-1', 'user-2'],
      },
    };
    expect(convertHighlightedFieldsToPrevalenceFilters(highlightedFields)).toEqual({
      'host.name': { terms: { 'host.name': ['host-1'] } },
      'user.name': { terms: { 'user.name': ['user-1', 'user-2'] } },
    });
  });
});
