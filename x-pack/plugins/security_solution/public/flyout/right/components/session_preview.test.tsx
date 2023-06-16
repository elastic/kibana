/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { useProcessData } from '../hooks/use_process_data';
import { SessionPreview } from './session_preview';
import { TestProviders } from '../../../common/mock';
import React from 'react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { RightPanelContext } from '../context';
import { SESSION_PREVIEW_VIEW_DETAILS_BUTTON_TEST_ID } from './test_ids';
import { LeftPanelKey, LeftPanelVisualizeTabPath } from '../../left';

jest.mock('../hooks/use_process_data');

const flyoutContextValue = {
  openLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutContext;

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  browserFields: {},
  dataFormattedForFieldBrowser: [],
} as unknown as RightPanelContext;

const renderSessionPreview = () =>
  render(
    <TestProviders>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <SessionPreview />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    </TestProviders>
  );

describe('SessionPreview', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders session preview with all data', () => {
    jest.mocked(useProcessData).mockReturnValue({
      processName: 'process1',
      userName: 'user1',
      startAt: '2022-01-01T00:00:00.000Z',
      ruleName: 'rule1',
      ruleId: 'id',
      workdir: '/path/to/workdir',
      command: 'command1',
    });

    renderSessionPreview();

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('started')).toBeInTheDocument();
    expect(screen.getByText('process1')).toBeInTheDocument();
    expect(screen.getByText('at')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2022 @ 00:00:00.000')).toBeInTheDocument();
    expect(screen.getByText('with rule')).toBeInTheDocument();
    expect(screen.getByText('rule1')).toBeInTheDocument();
    expect(screen.getByText('by')).toBeInTheDocument();
    expect(screen.getByText('/path/to/workdir command1')).toBeInTheDocument();
  });

  it('renders session preview without optional data', () => {
    jest.mocked(useProcessData).mockReturnValue({
      processName: 'process1',
      userName: 'user1',
      startAt: null,
      ruleName: null,
      ruleId: null,
      command: null,
      workdir: null,
    });

    renderSessionPreview();

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('started')).toBeInTheDocument();
    expect(screen.getByText('process1')).toBeInTheDocument();
    expect(screen.queryByText('at')).not.toBeInTheDocument();
    expect(screen.queryByText('with rule')).not.toBeInTheDocument();
    expect(screen.queryByText('by')).not.toBeInTheDocument();
  });

  it('should navigate to left section Visualize tab when clicking on title', () => {
    jest.mocked(useProcessData).mockReturnValue({
      processName: 'process1',
      userName: 'user1',
      startAt: '2022-01-01T00:00:00.000Z',
      ruleName: 'rule1',
      ruleId: 'id',
      workdir: '/path/to/workdir',
      command: 'command1',
    });

    const { getByTestId } = renderSessionPreview();

    getByTestId(SESSION_PREVIEW_VIEW_DETAILS_BUTTON_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: LeftPanelKey,
      path: LeftPanelVisualizeTabPath,
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
        scopeId: panelContextValue.scopeId,
      },
    });
  });
});
