/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import React from 'react';
import { RightPanelContext } from '../context';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';
import { isInvestigateInResolverActionEnabled } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useAlertPrevalenceFromProcessTree } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import * as mock from '../mocks/mock_analyzer_data';
import {
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../shared/components/test_ids';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_context';
import { useInvestigateInTimeline } from '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';

jest.mock('../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver');
jest.mock('../../../common/containers/alerts/use_alert_prevalence_from_process_tree');
jest.mock(
  '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

const panelContextValue = {
  dataAsNestedObject: null,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
} as unknown as RightPanelContext;

const TEST_ID = ANALYZER_PREVIEW_TEST_ID;
const ERROR_TEST_ID = `${ANALYZER_PREVIEW_TEST_ID}Error`;

const renderAnalyzerPreview = () =>
  render(
    <TestProviders>
      <RightPanelContext.Provider value={panelContextValue}>
        <AnalyzerPreviewContainer />
      </RightPanelContext.Provider>
    </TestProviders>
  );

describe('AnalyzerPreviewContainer', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render component and link in header', () => {
    (isInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);
    (useAlertPrevalenceFromProcessTree as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      alertIds: ['alertid'],
      statsNodes: mock.mockStatsNodes,
    });
    (useInvestigateInTimeline as jest.Mock).mockReturnValue({
      investigateInTimelineAlertClick: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderAnalyzerPreview();

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ERROR_TEST_ID)).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });

  it('should render error message and text in header', () => {
    (isInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(false);
    (useInvestigateInTimeline as jest.Mock).mockReturnValue({
      investigateInTimelineAlertClick: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderAnalyzerPreview();

    expect(queryByTestId(TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(ERROR_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(ANALYZER_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
  });

  it('should navigate to left section Visualize tab when clicking on title', () => {
    (isInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);
    (useAlertPrevalenceFromProcessTree as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      alertIds: ['alertid'],
      statsNodes: mock.mockStatsNodes,
    });
    (useInvestigateInTimeline as jest.Mock).mockReturnValue({
      investigateInTimelineAlertClick: jest.fn(),
    });

    const { getByTestId } = renderAnalyzerPreview();

    const { investigateInTimelineAlertClick } = useInvestigateInTimeline({});

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(ANALYZER_PREVIEW_TEST_ID)).click();
    expect(investigateInTimelineAlertClick).toHaveBeenCalled();
  });
});
