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
import { FlyoutHistory, getProcessedHistory } from './flyout_history';

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

describe('getProcessedHistory', () => {
  const simpleHistory = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
  const complexHistory = [
    { id: '1' },
    { id: '2' },
    { id: '1' },
    { id: '3' },
    { id: '4' },
    { id: '2' },
  ];

  it('returns a reversed history array and removes latest entry', () => {
    // input: 1, 2, 3, 4
    // reverse: 4, 3, 2, 1
    // remove latest: 4, 3, 2
    const processedHistory = getProcessedHistory({ history: simpleHistory, maxCount: 5 });
    expect(processedHistory).toEqual([{ id: '3' }, { id: '2' }, { id: '1' }]);
  });

  it('returns processed history with the maxCount', () => {
    // input: 1, 2, 3, 4
    // reverse: 4, 3, 2, 1
    // remove latest: 3, 2, 1
    // keep maxCount: 3, 2
    const processedHistory = getProcessedHistory({ history: simpleHistory, maxCount: 2 });
    expect(processedHistory).toEqual([{ id: '3' }, { id: '2' }]);
  });

  it('removes duplicates and reverses', () => {
    // input: 1, 2, 1, 3, 4, 2
    // reverse: 2, 4, 3, 1, 2, 1
    // remove duplicates: 2, 4, 3, 1
    // remove latest: 4, 3, 1
    const processedHistory = getProcessedHistory({ history: complexHistory, maxCount: 5 });
    expect(processedHistory).toEqual([{ id: '4' }, { id: '3' }, { id: '1' }]);
  });

  it('returns empty array if history only has one entry', () => {
    const processedHistory = getProcessedHistory({ history: [{ id: '1' }], maxCount: 5 });
    expect(processedHistory).toEqual([]);
  });

  it('returns empty array if history is empty', () => {
    const processedHistory = getProcessedHistory({ history: [], maxCount: 5 });
    expect(processedHistory).toEqual([]);
  });
});
