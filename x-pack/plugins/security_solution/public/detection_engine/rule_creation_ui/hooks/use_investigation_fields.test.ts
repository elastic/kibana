/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { DataViewFieldBase } from '@kbn/es-query';

import { useInvestigationFields } from './use_investigation_fields';

import { createQueryWrapperMock } from '../../../common/__mocks__/query_wrapper';

import { computeIsESQLQueryAggregating } from '@kbn/securitysolution-utils';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';

jest.mock('@kbn/securitysolution-utils', () => ({
  computeIsESQLQueryAggregating: jest.fn(),
}));

jest.mock('@kbn/text-based-editor', () => ({
  fetchFieldsFromESQL: jest.fn(),
}));

const computeIsESQLQueryAggregatingMock = computeIsESQLQueryAggregating as jest.Mock;
const fetchFieldsFromESQLMock = fetchFieldsFromESQL as jest.Mock;

const { wrapper } = createQueryWrapperMock();

const mockEsqlQuery = 'from auditbeat* [metadata _id]';
const mockIndexPatternFields: DataViewFieldBase[] = [
  {
    name: 'agent.name',
    type: 'string',
  },
  {
    name: 'agent.type',
    type: 'string',
  },
];
const mockEsqlDatatable = {
  type: 'datatable',
  rows: [],
  columns: [{ id: '_custom_field', name: '_custom_field', meta: { type: 'string' } }],
};

describe('useInvestigationFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchFieldsFromESQLMock.mockResolvedValue(mockEsqlDatatable);
  });

  it('should return loading true when esql fields still loading', () => {
    const { result } = renderHook(
      () =>
        useInvestigationFields({
          esqlQuery: mockEsqlQuery,
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should return only index pattern fields when ES|QL query is empty', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
        useInvestigationFields({
          esqlQuery: '',
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    await waitForNextUpdate();

    expect(result.current.investigationFields).toEqual(mockIndexPatternFields);
  });

  it('should return only index pattern fields when ES|QL query is undefined', async () => {
    const { result } = renderHook(
      () =>
        useInvestigationFields({
          esqlQuery: undefined,
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    expect(result.current.investigationFields).toEqual(mockIndexPatternFields);
  });

  it('should return index pattern fields concatenated with ES|QL fields when ES|QL query is non-aggregating', async () => {
    computeIsESQLQueryAggregatingMock.mockReturnValue(false);

    const { result } = renderHook(
      () =>
        useInvestigationFields({
          esqlQuery: mockEsqlQuery,
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    expect(result.current.investigationFields).toEqual([
      {
        name: '_custom_field',
        type: 'string',
      },
      ...mockIndexPatternFields,
    ]);
  });

  it('should return only ES|QL fields when ES|QL query is aggregating', async () => {
    computeIsESQLQueryAggregatingMock.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useInvestigationFields({
          esqlQuery: mockEsqlQuery,
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    expect(result.current.investigationFields).toEqual([
      {
        name: '_custom_field',
        type: 'string',
      },
    ]);
  });
});
