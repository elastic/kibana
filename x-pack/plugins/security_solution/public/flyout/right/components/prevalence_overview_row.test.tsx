/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { PrevalenceOverviewRow } from './prevalence_overview_row';
import { useFetchFieldValuePairWithAggregation } from '../../shared/hooks/use_fetch_field_value_pair_with_aggregation';
import { useFetchUniqueByField } from '../../shared/hooks/use_fetch_unique_by_field';

jest.mock('../../shared/hooks/use_fetch_field_value_pair_with_aggregation');
jest.mock('../../shared/hooks/use_fetch_unique_by_field');

const highlightedField = {
  name: 'field',
  values: ['values'],
};
const dataTestSubj = 'test';
const iconDataTestSubj = 'testIcon';
const valueDataTestSubj = 'testValue';
const colorDataTestSubj = 'testColor';
const loadingDataTestSubj = 'testLoading';

describe('<PrevalenceOverviewRow />', () => {
  it('should display row if prevalence is below or equal threshold', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 10,
    });

    const { getByTestId, getAllByText, queryByTestId } = render(
      <PrevalenceOverviewRow highlightedField={highlightedField} data-test-subj={dataTestSubj} />
    );

    const { name, values } = highlightedField;

    expect(getByTestId(iconDataTestSubj)).toBeInTheDocument();
    expect(getByTestId(valueDataTestSubj)).toBeInTheDocument();
    expect(getAllByText(`${name}, ${values} is uncommon`)).toHaveLength(1);
    expect(queryByTestId(colorDataTestSubj)).not.toBeInTheDocument();
  });

  it('should not display row if prevalence is higher than threshold', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 2,
    });

    const { queryAllByAltText } = render(
      <PrevalenceOverviewRow highlightedField={highlightedField} data-test-subj={dataTestSubj} />
    );

    expect(queryAllByAltText('is uncommon')).toHaveLength(0);
  });

  it('should not display row if error retrieving data', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      count: 0,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      count: 0,
    });

    const { queryAllByAltText } = render(
      <PrevalenceOverviewRow highlightedField={highlightedField} data-test-subj={dataTestSubj} />
    );

    expect(queryAllByAltText('is uncommon')).toHaveLength(0);
  });

  it('should display loading', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      count: 1,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 10,
    });

    const { getByTestId } = render(
      <PrevalenceOverviewRow highlightedField={highlightedField} data-test-subj={dataTestSubj} />
    );

    expect(getByTestId(loadingDataTestSubj)).toBeInTheDocument();
  });
});
