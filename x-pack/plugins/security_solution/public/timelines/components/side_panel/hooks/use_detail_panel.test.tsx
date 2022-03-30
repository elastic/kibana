/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useDetailPanel, UseDetailPanelConfig } from './use_detail_panel';
import { timelineActions } from '../../../store/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { TimelineId, TimelineTabs } from '../../../../../common/types';

const mockDispatch = jest.fn();
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_selector');
jest.mock('../../../store/timeline');
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../../common/containers/sourcerer', () => {
  const mockSourcererReturn = {
    browserFields: {},
    docValueFields: [],
    loading: true,
    indexPattern: {},
    selectedPatterns: [],
    missingPatterns: [],
  };
  return {
    useSourcererDataView: jest.fn().mockReturnValue(mockSourcererReturn),
  };
});

describe('useDetailPanel', () => {
  const defaultProps: UseDetailPanelConfig = {
    sourcererScope: SourcererScopeName.detections,
    timelineId: TimelineId.test,
  };
  const mockGetExpandedDetail = jest.fn().mockImplementation(() => ({}));
  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockImplementation((cb) => {
      return mockGetExpandedDetail();
    });
  });
  afterEach(() => {
    (useDeepEqualSelector as jest.Mock).mockClear();
  });

  test('should return openDetailsPanel fn, handleOnDetailsPanelClosed fn, shouldShowDetailsPanel, and the DetailsPanel component', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        return useDetailPanel(defaultProps);
      });
      await waitForNextUpdate();

      expect(result.current.openDetailsPanel).toBeDefined();
      expect(result.current.handleOnDetailsPanelClosed).toBeDefined();
      expect(result.current.shouldShowDetailsPanel).toBe(false);
      expect(result.current.DetailsPanel).toBeNull();
    });
  });

  test('should fire redux action to open details panel', async () => {
    const testEventId = '123';
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        return useDetailPanel(defaultProps);
      });
      await waitForNextUpdate();

      result.current?.openDetailsPanel(testEventId);

      expect(mockDispatch).toHaveBeenCalled();
      expect(timelineActions.toggleDetailPanel).toHaveBeenCalled();
    });
  });

  test('should call provided onClose callback provided to openDetailsPanel fn', async () => {
    const testEventId = '123';
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        return useDetailPanel(defaultProps);
      });
      await waitForNextUpdate();

      const mockOnClose = jest.fn();
      result.current?.openDetailsPanel(testEventId, mockOnClose);
      result.current?.handleOnDetailsPanelClosed();

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  test('should call the last onClose callback provided to openDetailsPanel fn', async () => {
    // Test that the onClose ref is properly updated
    const testEventId = '123';
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        return useDetailPanel(defaultProps);
      });
      await waitForNextUpdate();

      const mockOnClose = jest.fn();
      const secondMockOnClose = jest.fn();
      result.current?.openDetailsPanel(testEventId, mockOnClose);
      result.current?.handleOnDetailsPanelClosed();

      expect(mockOnClose).toHaveBeenCalled();

      result.current?.openDetailsPanel(testEventId, secondMockOnClose);
      result.current?.handleOnDetailsPanelClosed();

      expect(secondMockOnClose).toHaveBeenCalled();
    });
  });

  test('should show the details panel', async () => {
    mockGetExpandedDetail.mockImplementation(() => ({
      [TimelineTabs.session]: {
        panelView: 'somePanel',
      },
    }));
    const updatedProps = {
      ...defaultProps,
      tabType: TimelineTabs.session,
    };

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        return useDetailPanel(updatedProps);
      });
      await waitForNextUpdate();

      expect(result.current.DetailsPanel).toMatchInlineSnapshot(`
        <Memo(DetailsPanel)
          browserFields={Object {}}
          docValueFields={Array []}
          handleOnPanelClosed={[Function]}
          tabType="session"
          timelineId="test"
        />
      `);
    });
  });
});
