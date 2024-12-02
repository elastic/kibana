/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { mockFlyoutApi } from '../mocks/mock_flyout_context';
import { useWhichFlyout } from './use_which_flyout';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../../common/lib/kibana';
import {
  DocumentDetailsRightPanelKey,
  DocumentDetailsLeftPanelKey,
  VisualizationTabGraphKey,
} from '../constants/panel_keys';
import { useNavigateToGraphVisualization } from './use_navigate_to_graph_visualization';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../common/lib/kibana');
jest.mock('./use_which_flyout');

const mockedUseKibana = mockUseKibana();
(useKibana as jest.Mock).mockReturnValue(mockedUseKibana);

const mockUseWhichFlyout = useWhichFlyout as jest.Mock;
const FLYOUT_KEY = 'SecuritySolution';

const eventId = 'eventId1';
const indexName = 'index1';
const scopeId = 'scopeId1';

describe('useNavigateToGraphVisualization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('when isFlyoutOpen is true, should return callback that opens left and preview panels', () => {
    mockUseWhichFlyout.mockReturnValue(FLYOUT_KEY);
    const hookResult = renderHook(() =>
      useNavigateToGraphVisualization({ isFlyoutOpen: true, eventId, indexName, scopeId })
    );

    // Act
    hookResult.result.current.navigateToGraphVisualization();

    expect(mockFlyoutApi.openLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: 'visualize',
        subTab: VisualizationTabGraphKey,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  });

  it('when isFlyoutOpen is false and scopeId is not timeline, should return callback that opens a new flyout', () => {
    mockUseWhichFlyout.mockReturnValue(null);

    const hookResult = renderHook(() =>
      useNavigateToGraphVisualization({ isFlyoutOpen: false, eventId, indexName, scopeId })
    );

    // Act
    hookResult.result.current.navigateToGraphVisualization();

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
          subTab: VisualizationTabGraphKey,
        },
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      },
    });
  });
});
