/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import {
  CORRELATIONS_RELATED_CASES_TEST_ID,
  SUMMARY_ROW_ICON_TEST_ID,
  SUMMARY_ROW_LOADING_TEST_ID,
  SUMMARY_ROW_VALUE_TEST_ID,
} from './test_ids';
import { RelatedCases } from './related_cases';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';

jest.mock('../../shared/hooks/use_fetch_related_cases');

const eventId = 'eventId';

const ICON_TEST_ID = SUMMARY_ROW_ICON_TEST_ID(CORRELATIONS_RELATED_CASES_TEST_ID);
const VALUE_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(CORRELATIONS_RELATED_CASES_TEST_ID);
const LOADING_TEST_ID = SUMMARY_ROW_LOADING_TEST_ID(CORRELATIONS_RELATED_CASES_TEST_ID);

const renderRelatedCases = () =>
  render(
    <IntlProvider locale="en">
      <RelatedCases eventId={eventId} />
    </IntlProvider>
  );

describe('<RelatedCases />', () => {
  it('should render many related cases correctly', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 2,
    });

    const { getByTestId } = renderRelatedCases();
    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('2 related cases');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
  });

  it('should render single related case correctly', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });

    const { getByTestId } = renderRelatedCases();
    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('1 related case');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading skeleton', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { getByTestId } = renderRelatedCases();
    expect(getByTestId(LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render null if error', () => {
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { container } = renderRelatedCases();
    expect(container).toBeEmptyDOMElement();
  });
});
