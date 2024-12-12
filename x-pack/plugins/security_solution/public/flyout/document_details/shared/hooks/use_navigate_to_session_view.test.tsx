/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useNavigateToSessionView } from './use_navigate_to_session_view';
import { mockFlyoutApi } from '../mocks/mock_flyout_context';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../../common/lib/kibana';
import { DocumentDetailsRightPanelKey, DocumentDetailsLeftPanelKey } from '../constants/panel_keys';
import { SESSION_VIEW_ID } from '../../left/components/session_view';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../common/lib/kibana');

const mockedUseKibana = mockUseKibana();
(useKibana as jest.Mock).mockReturnValue(mockedUseKibana);

const eventId = 'eventId1';
const indexName = 'index1';
const scopeId = 'scopeId1';

describe('useNavigateToSessionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('when isFlyoutOpen is true, should return callback that opens left panel', () => {
    const hookResult = renderHook(() =>
      useNavigateToSessionView({ isFlyoutOpen: true, eventId, indexName, scopeId })
    );
    hookResult.result.current.navigateToSessionView();

    expect(mockFlyoutApi.openLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: 'visualize',
        subTab: SESSION_VIEW_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  });

  it('when isFlyoutOpen is false, should return callback that opens a new flyout', () => {
    const hookResult = renderHook(() =>
      useNavigateToSessionView({ isFlyoutOpen: false, eventId, indexName, scopeId })
    );
    hookResult.result.current.navigateToSessionView();
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
          subTab: SESSION_VIEW_ID,
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
