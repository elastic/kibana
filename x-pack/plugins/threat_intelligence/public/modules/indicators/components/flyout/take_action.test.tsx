/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { generateMockFileIndicator, Indicator } from '../../../../../common/types/indicator';
import { TestProvidersComponent } from '../../../../mocks/test_providers';
import { TakeAction } from './take_action';
import { TAKE_ACTION_BUTTON_TEST_ID } from './test_ids';

describe('TakeAction', () => {
  it('should render an EuiContextMenuPanel', () => {
    const indicator: Indicator = generateMockFileIndicator();
    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <TakeAction indicator={indicator} />
      </TestProvidersComponent>
    );
    expect(getByTestId(TAKE_ACTION_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Take action')).toHaveLength(1);
  });
});
