/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { generateMockIndicator, Indicator } from '../../../../../common/types/Indicator';
import {
  CODE_BLOCK_TEST_ID,
  EMPTY_PROMPT_TEST_ID,
  IndicatorsFlyoutJson,
} from './indicators_flyout_json';

const mockIndicator: Indicator = generateMockIndicator();

describe('IndicatorsFlyoutJson', () => {
  it('should render code block component on valid indicator', () => {
    const { getByTestId } = render(<IndicatorsFlyoutJson indicator={mockIndicator} />);

    expect(getByTestId(CODE_BLOCK_TEST_ID)).toBeInTheDocument();
  });

  it('should render error message on invalid indicator', () => {
    const { getByTestId, getByText } = render(
      <IndicatorsFlyoutJson indicator={{} as unknown as Indicator} />
    );

    expect(getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display indicator information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the indicator fields and values.')
    ).toBeInTheDocument();
  });
});
