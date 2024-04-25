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
  SUMMARY_ROW_ICON_TEST_ID,
  SUMMARY_ROW_VALUE_TEST_ID,
  CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID,
  CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID,
} from './test_ids';
import { SuppressedAlerts } from './suppressed_alerts';
import { isSuppressionRuleInGA } from '../../../../../common/detection_engine/utils';

const ICON_TEST_ID = SUMMARY_ROW_ICON_TEST_ID(CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID);
const VALUE_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID);

const renderSuppressedAlerts = (alertSuppressionCount: number) =>
  render(
    <IntlProvider locale="en">
      <SuppressedAlerts alertSuppressionCount={alertSuppressionCount} ruleType="query" />
    </IntlProvider>
  );

jest.mock('../../../../../common/detection_engine/utils', () => ({
  isSuppressionRuleInGA: jest.fn().mockReturnValue(false),
}));

const isSuppressionRuleInGAMock = isSuppressionRuleInGA as jest.Mock;

describe('<SuppressedAlerts />', () => {
  it('should render zero suppressed alert correctly', () => {
    const { getByTestId } = renderSuppressedAlerts(0);

    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('0 suppressed alert');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID)
    ).toBeInTheDocument();
  });

  it('should render single suppressed alert correctly', () => {
    const { getByTestId } = renderSuppressedAlerts(1);

    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('1 suppressed alert');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID)
    ).toBeInTheDocument();
  });

  it('should render multiple suppressed alerts row correctly', () => {
    const { getByTestId } = renderSuppressedAlerts(2);

    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('2 suppressed alerts');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID)
    ).toBeInTheDocument();
  });

  it('should not render Technical Preview badge if rule type is in GA', () => {
    isSuppressionRuleInGAMock.mockReturnValueOnce(true);
    const { queryByTestId } = renderSuppressedAlerts(2);

    expect(
      queryByTestId(CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID)
    ).not.toBeInTheDocument();
  });
});
