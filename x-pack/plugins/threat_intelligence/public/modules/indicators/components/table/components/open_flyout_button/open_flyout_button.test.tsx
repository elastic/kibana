/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OpenIndicatorFlyoutButton } from '.';
import { generateMockIndicator } from '../../../../../../../common/types/indicator';
import { TestProvidersComponent } from '../../../../../../common/mocks/test_providers';
import { BUTTON_TEST_ID } from './test_ids';

const mockIndicator = generateMockIndicator();

describe('<IndicatorsFlyout />', () => {
  it('should render expand button if flyout is closed', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <OpenIndicatorFlyoutButton indicator={mockIndicator} isOpen={false} onOpen={jest.fn()} />
      </TestProvidersComponent>
    );

    expect(getByTestId(BUTTON_TEST_ID).innerHTML).toContain('expand');
  });

  it(`should render minimize button if flyout is open`, () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <OpenIndicatorFlyoutButton indicator={mockIndicator} isOpen={true} onOpen={jest.fn()} />
      </TestProvidersComponent>
    );

    const button = getByTestId(BUTTON_TEST_ID);
    button.click();
    expect(button.innerHTML).toContain('minimize');
  });
});
