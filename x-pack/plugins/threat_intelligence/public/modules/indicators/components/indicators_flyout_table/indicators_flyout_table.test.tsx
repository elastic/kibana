/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';
import {
  generateMockIndicator,
  Indicator,
  RawIndicatorFieldId,
} from '../../../../../common/types/Indicator';
import {
  EMPTY_PROMPT_TEST_ID,
  IndicatorsFlyoutTable,
  TABLE_TEST_ID,
} from './indicators_flyout_table';
import { unwrapValue } from '../../lib/unwrap_value';
import { displayValue } from '../../lib/display_value';

const mockIndicator: Indicator = generateMockIndicator();

describe('IndicatorsFlyoutTable', () => {
  it('should render fields and values in table', () => {
    const { getByTestId, getByText } = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutTable indicator={mockIndicator} />
      </TestProvidersComponent>
    );

    expect(getByTestId(TABLE_TEST_ID)).toBeInTheDocument();

    expect(getByText(RawIndicatorFieldId.Feed)).toBeInTheDocument();

    expect(getByText(displayValue(mockIndicator) as string)).toBeInTheDocument();

    expect(
      getByText(unwrapValue(mockIndicator, RawIndicatorFieldId.Feed) as string)
    ).toBeInTheDocument();
  });

  it('should render error message on invalid indicator', () => {
    const { getByTestId, getByText } = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutTable indicator={{} as unknown as Indicator} />
      </TestProvidersComponent>
    );

    expect(getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display indicator information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the indicator fields and values.')
    ).toBeInTheDocument();
  });
});
