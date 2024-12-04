/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import {
  FLYOUT_HISTORY_TEST_ID,
  FLYOUT_HISTORY_BUTTON_TEST_ID,
  FLYOUT_HISTORY_CONTEXT_PANEL_TEST_ID,
} from './test_ids';
import { FlyoutHistory } from './flyout_history';

const mockedHistory = [{ id: '1' }, { id: '2' }];

describe('FlyoutHistory', () => {
  it('renders', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <FlyoutHistory history={mockedHistory} />
      </TestProviders>
    );
    expect(getByTestId(FLYOUT_HISTORY_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(FLYOUT_HISTORY_CONTEXT_PANEL_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders context menu when clicking the popover', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistory history={mockedHistory} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(FLYOUT_HISTORY_BUTTON_TEST_ID));
    expect(getByTestId(FLYOUT_HISTORY_CONTEXT_PANEL_TEST_ID)).toBeInTheDocument();
  });

  it('does not render if history is empty', () => {
    const { container } = render(
      <TestProviders>
        <FlyoutHistory history={[]} />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
