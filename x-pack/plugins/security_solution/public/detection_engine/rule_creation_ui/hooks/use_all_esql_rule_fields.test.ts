/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { DataViewFieldBase } from '@kbn/es-query';
import { getESQLQueryColumns } from '@kbn/esql-utils';

import { useAllEsqlRuleFields } from './use_all_esql_rule_fields';

import { createQueryWrapperMock } from '../../../common/__mocks__/query_wrapper';
import { computeIsESQLQueryAggregating } from '@kbn/securitysolution-utils';

jest.mock('@kbn/securitysolution-utils', () => ({ computeIsESQLQueryAggregating: jest.fn() }));

jest.mock('@kbn/esql-utils', () => {
  return {
    getESQLQueryColumns: jest.fn(),
    getIndexPatternFromESQLQuery: jest.fn().mockReturnValue('auditbeat*'),
  };
});

const computeIsESQLQueryAggregatingMock = computeIsESQLQueryAggregating as jest.Mock;
const getESQLQueryColumnsMock = getESQLQueryColumns as jest.Mock;

const { wrapper } = createQueryWrapperMock();

const mockEsqlQuery = 'from auditbeat* metadata _id';
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

// FLAKY: https://github.com/elastic/kibana/issues/190063
describe.skip('useAllEsqlRuleFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getESQLQueryColumnsMock.mockImplementation(({ esqlQuery }) =>
      Promise.resolve(
        esqlQuery === 'deduplicate_test'
          ? [
              { id: 'agent.name', name: 'agent.name', meta: { type: 'string' } }, // agent.name is already present in mockIndexPatternFields
              { id: '_custom_field_0', name: '_custom_field_0', meta: { type: 'string' } },
            ]
          : mockEsqlDatatable.columns
      )
    );
    computeIsESQLQueryAggregatingMock.mockReturnValue(false);
  });

  it('should return loading true when esql fields still loading', () => {
    const { result } = renderHook(
      () =>
        useAllEsqlRuleFields({
          esqlQuery: mockEsqlQuery,
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should return only index pattern fields when ES|QL query is empty', async () => {
    const { result } = renderHook(
      () =>
        useAllEsqlRuleFields({
          esqlQuery: '',
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    expect(result.current.fields).toEqual(mockIndexPatternFields);
  });

  it('should return only index pattern fields when ES|QL query is undefined', async () => {
    const { result } = renderHook(
      () =>
        useAllEsqlRuleFields({
          esqlQuery: undefined,
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    expect(result.current.fields).toEqual(mockIndexPatternFields);
  });

  it('should return index pattern fields concatenated with ES|QL fields when ES|QL query is non-aggregating', async () => {
    computeIsESQLQueryAggregatingMock.mockReturnValue(false);

    const { result, waitFor } = renderHook(
      () =>
        useAllEsqlRuleFields({
          esqlQuery: mockEsqlQuery,
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.fields).toEqual([
        {
          name: '_custom_field',
          type: 'string',
        },
        ...mockIndexPatternFields,
      ]);
    });
  });

  it('should return only ES|QL fields when ES|QL query is aggregating', async () => {
    computeIsESQLQueryAggregatingMock.mockReturnValue(true);

    const { result, waitFor } = renderHook(
      () =>
        useAllEsqlRuleFields({
          esqlQuery: mockEsqlQuery,
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );
    await waitFor(() => {
      expect(result.current.fields).toEqual([
        {
          name: '_custom_field',
          type: 'string',
        },
      ]);
    });
  });

  it('should deduplicate index pattern fields and ES|QL fields when fields have same name', async () => {
    //  getESQLQueryColumnsMock.mockClear();
    computeIsESQLQueryAggregatingMock.mockReturnValue(false);

    const { result, waitFor } = renderHook(
      () =>
        useAllEsqlRuleFields({
          esqlQuery: 'deduplicate_test',
          indexPatternsFields: mockIndexPatternFields,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.fields).toEqual([
        {
          name: 'agent.name',
          type: 'string',
        },
        {
          name: '_custom_field_0',
          type: 'string',
        },
        {
          name: 'agent.type',
          type: 'string',
        },
      ]);
    });
  });
});
