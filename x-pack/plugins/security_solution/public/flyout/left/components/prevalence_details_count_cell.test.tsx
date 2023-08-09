/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import {
  EventKind,
  useFetchFieldValuePairByEventType,
} from '../../shared/hooks/use_fetch_field_value_pair_by_event_type';
import {
  PREVALENCE_DETAILS_COUNT_CELL_ERROR_TEST_ID,
  PREVALENCE_DETAILS_COUNT_CELL_LOADING_TEST_ID,
  PREVALENCE_DETAILS_COUNT_CELL_VALUE_TEST_ID,
} from './test_ids';
import { PrevalenceDetailsCountCell } from './prevalence_details_count_cell';

jest.mock('../../shared/hooks/use_fetch_field_value_pair_by_event_type');

const highlightedField = {
  name: 'field',
  values: ['values'],
};
const type = {
  eventKind: EventKind.signal,
  include: true,
};

describe('PrevalenceDetailsAlertCountCell', () => {
  it('should show loading spinner', () => {
    jest.mocked(useFetchFieldValuePairByEventType).mockReturnValue({
      loading: true,
      error: false,
      count: 0,
    });

    const { getByTestId } = render(
      <PrevalenceDetailsCountCell highlightedField={highlightedField} type={type} />
    );

    expect(getByTestId(PREVALENCE_DETAILS_COUNT_CELL_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should return error icon', () => {
    jest.mocked(useFetchFieldValuePairByEventType).mockReturnValue({
      loading: false,
      error: true,
      count: 0,
    });

    const { getByTestId } = render(
      <PrevalenceDetailsCountCell highlightedField={highlightedField} type={type} />
    );

    expect(getByTestId(PREVALENCE_DETAILS_COUNT_CELL_ERROR_TEST_ID)).toBeInTheDocument();
  });

  it('should show count value with eventKind undefined', () => {
    jest.mocked(useFetchFieldValuePairByEventType).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });

    const { getByTestId } = render(
      <PrevalenceDetailsCountCell highlightedField={highlightedField} type={type} />
    );

    expect(getByTestId(PREVALENCE_DETAILS_COUNT_CELL_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(PREVALENCE_DETAILS_COUNT_CELL_VALUE_TEST_ID)).toHaveTextContent('1');
  });

  it('should show count value with eventKind passed via props', () => {
    jest.mocked(useFetchFieldValuePairByEventType).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });

    const { getByTestId } = render(
      <PrevalenceDetailsCountCell highlightedField={highlightedField} type={type} />
    );

    expect(getByTestId(PREVALENCE_DETAILS_COUNT_CELL_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(PREVALENCE_DETAILS_COUNT_CELL_VALUE_TEST_ID)).toHaveTextContent('1');
  });
});
