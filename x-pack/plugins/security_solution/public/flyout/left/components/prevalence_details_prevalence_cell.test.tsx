/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import {
  PREVALENCE_DETAILS_PREVALENCE_CELL_LOADING_TEST_ID,
  PREVALENCE_DETAILS_PREVALENCE_CELL_VALUE_TEST_ID,
} from './test_ids';
import { PrevalenceDetailsPrevalenceCell } from './prevalence_details_prevalence_cell';
import { useFetchFieldValuePairWithAggregation } from '../../shared/hooks/use_fetch_field_value_pair_with_aggregation';
import { useFetchUniqueByField } from '../../shared/hooks/use_fetch_unique_by_field';

jest.mock('../../shared/hooks/use_fetch_field_value_pair_with_aggregation');
jest.mock('../../shared/hooks/use_fetch_unique_by_field');

const field = 'field';
const values = ['values'];
const scopeId = 'scopeId';
const aggregationField = 'aggregationField';

describe('PrevalenceDetailsAlertCountCell', () => {
  it('should show loading spinner when useFetchFieldValuePairWithAggregation loading', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      count: 0,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 0,
    });

    const { getByTestId } = render(
      <PrevalenceDetailsPrevalenceCell
        field={field}
        values={values}
        scopeId={scopeId}
        aggregationField={aggregationField}
      />
    );

    expect(getByTestId(PREVALENCE_DETAILS_PREVALENCE_CELL_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should show loading spinner when useFetchUniqueByField loading', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 0,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      count: 0,
    });

    const { getByTestId } = render(
      <PrevalenceDetailsPrevalenceCell
        field={field}
        values={values}
        scopeId={scopeId}
        aggregationField={aggregationField}
      />
    );

    expect(getByTestId(PREVALENCE_DETAILS_PREVALENCE_CELL_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should return null if useFetchFieldValuePairWithAggregation errors out', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      count: 0,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 0,
    });

    const { container } = render(
      <PrevalenceDetailsPrevalenceCell
        field={field}
        values={values}
        scopeId={scopeId}
        aggregationField={aggregationField}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should return null if useFetchUniqueByField errors out', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 0,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      count: 0,
    });

    const { container } = render(
      <PrevalenceDetailsPrevalenceCell
        field={field}
        values={values}
        scopeId={scopeId}
        aggregationField={aggregationField}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should return null if prevalence is infinite', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 0,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 0,
    });

    const { container } = render(
      <PrevalenceDetailsPrevalenceCell
        field={field}
        values={values}
        scopeId={scopeId}
        aggregationField={aggregationField}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should show prevalence value', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });

    const { getByTestId } = render(
      <PrevalenceDetailsPrevalenceCell
        field={field}
        values={values}
        scopeId={scopeId}
        aggregationField={aggregationField}
      />
    );

    expect(getByTestId(PREVALENCE_DETAILS_PREVALENCE_CELL_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(PREVALENCE_DETAILS_PREVALENCE_CELL_VALUE_TEST_ID)).toHaveTextContent('1');
  });
});
