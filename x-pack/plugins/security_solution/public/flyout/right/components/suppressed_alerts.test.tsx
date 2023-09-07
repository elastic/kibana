/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  SUMMARY_ROW_ICON_TEST_ID,
  SUMMARY_ROW_VALUE_TEST_ID,
  INSIGHTS_CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID,
  SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID,
} from './test_ids';
import { SuppressedAlerts } from './suppressed_alerts';

const ICON_TEST_ID = SUMMARY_ROW_ICON_TEST_ID(INSIGHTS_CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID);
const VALUE_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(INSIGHTS_CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID);

describe('<SuppressedAlerts />', () => {
  it('should render zero suppressed alert correctly', () => {
    const { getByTestId } = render(<SuppressedAlerts alertSuppressionCount={0} />);

    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('0 suppressed alert');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should render single suppressed alert correctly', () => {
    const { getByTestId } = render(<SuppressedAlerts alertSuppressionCount={1} />);

    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('1 suppressed alert');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should render multiple suppressed alerts row correctly', () => {
    const { getByTestId } = render(<SuppressedAlerts alertSuppressionCount={2} />);

    expect(getByTestId(ICON_TEST_ID)).toBeInTheDocument();
    const value = getByTestId(VALUE_TEST_ID);
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('2 suppressed alerts');
    expect(getByTestId(VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID)).toBeInTheDocument();
  });
});
