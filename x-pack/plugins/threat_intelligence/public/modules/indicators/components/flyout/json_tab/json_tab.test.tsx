/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProvidersComponent } from '../../../../../common/mocks/test_providers';
import { generateMockIndicator, Indicator } from '../../../../../../common/types/indicator';
import { IndicatorsFlyoutJson } from '.';
import { EMPTY_PROMPT_TEST_ID } from '../empty_prompt';
import { CODE_BLOCK_TEST_ID } from './test_ids';

const mockIndicator: Indicator = generateMockIndicator();

describe('<IndicatorsFlyoutJson />', () => {
  it('should render code block component on valid indicator', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutJson indicator={mockIndicator} />
      </TestProvidersComponent>
    );

    expect(getByTestId(CODE_BLOCK_TEST_ID)).toBeInTheDocument();
  });

  it('should render error message on invalid indicator', () => {
    const { getByTestId, getByText } = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutJson indicator={{} as unknown as Indicator} />
      </TestProvidersComponent>
    );

    expect(getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display indicator information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the indicator fields and values.')
    ).toBeInTheDocument();
  });
});
