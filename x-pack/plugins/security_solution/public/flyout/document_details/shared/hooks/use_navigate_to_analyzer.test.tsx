/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useNavigateToAnalyzer } from './use_navigate_to_analyzer';
import { mockFlyoutApi } from '../mocks/mock_flyout_context';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../../common/lib/kibana';
import { DocumentDetailsRightPanelKey, DocumentDetailsLeftPanelKey } from '../constants/panel_keys';
import { ANALYZE_GRAPH_ID } from '../../left/components/analyze_graph';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../common/lib/kibana');
jest.mock('./use_which_flyout');

const mockedUseKibana = mockUseKibana();
(useKibana as jest.Mock).mockReturnValue(mockedUseKibana);

const eventId = 'eventId1';
const indexName = 'index1';
const scopeId = 'scopeId1';

describe('useNavigateToAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('when isFlyoutOpen is true, should return callback that opens left and preview panels', () => {
    const hookResult = renderHook(() =>
      useNavigateToAnalyzer({ isFlyoutOpen: true, eventId, indexName, scopeId })
    );
    hookResult.result.current.navigateToAnalyzer();

    expect(mockFlyoutApi.openLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: 'visualize',
        subTab: ANALYZE_GRAPH_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  });

  it('when isFlyoutOpen is false and scopeId is not timeline, should return callback that opens a new flyout', () => {
    const hookResult = renderHook(() =>
      useNavigateToAnalyzer({ isFlyoutOpen: false, eventId, indexName, scopeId })
    );
    hookResult.result.current.navigateToAnalyzer();
    expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      },
      left: {
        id: DocumentDetailsLeftPanelKey,
        path: {
          tab: 'visualize',
          subTab: ANALYZE_GRAPH_ID,
        },
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      },
    });
  });

  it('when isFlyoutOpen is false and scopeId is current timeline, should return callback that opens a new flyout in timeline', () => {
    const timelineId = 'timeline-1';
    const hookResult = renderHook(() =>
      useNavigateToAnalyzer({ isFlyoutOpen: false, eventId, indexName, scopeId: timelineId })
    );
    hookResult.result.current.navigateToAnalyzer();
    expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId: timelineId,
        },
      },
      left: {
        id: DocumentDetailsLeftPanelKey,
        path: {
          tab: 'visualize',
          subTab: ANALYZE_GRAPH_ID,
        },
        params: {
          id: eventId,
          indexName,
          scopeId: timelineId,
        },
      },
    });
  });
});
