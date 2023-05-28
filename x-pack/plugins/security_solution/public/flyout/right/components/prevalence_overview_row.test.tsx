/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { PrevalenceOverviewRow } from './prevalence_overview_row';
import { useFetchUniqueHostsWithFieldPair } from '../hooks/use_fetch_unique_hosts_with_field_value_pair';
import { useFetchUniqueHosts } from '../hooks/use_fetch_unique_hosts';

jest.mock('../hooks/use_fetch_unique_hosts_with_field_value_pair');
jest.mock('../hooks/use_fetch_unique_hosts');

const field = 'field';
const values = ['values'];
const scopeId = 'scopeId';
const dataTestSubj = 'test';
const iconDataTestSubj = 'testIcon';
const valueDataTestSubj = 'testValue';
const colorDataTestSubj = 'testColor';
const loadingDataTestSubj = 'testLoading';

describe('<PrevalenceOverviewRow />', () => {
  it('should display row if prevalence is below or equal threshold', () => {
    (useFetchUniqueHostsWithFieldPair as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });
    (useFetchUniqueHosts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 10,
    });

    const { getByTestId, getAllByText, queryByTestId } = render(
      <PrevalenceOverviewRow
        field={field}
        values={values}
        scopeId={scopeId}
        callbackIfNull={() => {}}
        data-test-subj={dataTestSubj}
      />
    );

    expect(getByTestId(iconDataTestSubj)).toBeInTheDocument();
    expect(getByTestId(valueDataTestSubj)).toBeInTheDocument();
    expect(getAllByText(`${field}, ${values} is uncommon`)).toHaveLength(1);
    expect(queryByTestId(colorDataTestSubj)).not.toBeInTheDocument();
  });

  it('should not display row if prevalence is higher than threshold', () => {
    (useFetchUniqueHostsWithFieldPair as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });
    (useFetchUniqueHosts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 2,
    });
    const callbackIfNull = jest.fn();

    const { queryAllByAltText } = render(
      <PrevalenceOverviewRow
        field={field}
        values={values}
        scopeId={scopeId}
        callbackIfNull={callbackIfNull}
        data-test-subj={dataTestSubj}
      />
    );

    expect(queryAllByAltText('is uncommon')).toHaveLength(0);
    expect(callbackIfNull).toHaveBeenCalled();
  });

  it('should not display row if error retrieving data', () => {
    (useFetchUniqueHostsWithFieldPair as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      count: 0,
    });
    (useFetchUniqueHosts as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      count: 0,
    });
    const callbackIfNull = jest.fn();

    const { queryAllByAltText } = render(
      <PrevalenceOverviewRow
        field={field}
        values={values}
        scopeId={scopeId}
        callbackIfNull={callbackIfNull}
        data-test-subj={dataTestSubj}
      />
    );

    expect(queryAllByAltText('is uncommon')).toHaveLength(0);
    expect(callbackIfNull).toHaveBeenCalled();
  });

  it('should display loading', () => {
    (useFetchUniqueHostsWithFieldPair as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      count: 1,
    });
    (useFetchUniqueHosts as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 10,
    });

    const { getByTestId } = render(
      <PrevalenceOverviewRow
        field={field}
        values={values}
        scopeId={scopeId}
        callbackIfNull={() => {}}
        data-test-subj={dataTestSubj}
      />
    );

    expect(getByTestId(loadingDataTestSubj)).toBeInTheDocument();
  });
});
