/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import type { UseDetailPanelConfig } from './use_detail_panel';
import { useDetailPanel } from './use_detail_panel';
import { timelineActions } from '../../../store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';

const mockDispatch = jest.fn();
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_selector');
jest.mock('../../../store');
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
    scopeId: TimelineId.test,
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

  test('should return open fns (event, host, network, user), handleOnDetailsPanelClosed fn, shouldShowDetailsPanel, and the DetailsPanel component', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        return useDetailPanel(defaultProps);
      });
      await waitForNextUpdate();

      expect(result.current.openEventDetailsPanel).toBeDefined();
      expect(result.current.openHostDetailsPanel).toBeDefined();
      expect(result.current.openNetworkDetailsPanel).toBeDefined();
      expect(result.current.openUserDetailsPanel).toBeDefined();
      expect(result.current.handleOnDetailsPanelClosed).toBeDefined();
      expect(result.current.shouldShowDetailsPanel).toBe(false);
      expect(result.current.DetailsPanel).toBeNull();
    });
  });

  describe('open event details', () => {
    const testEventId = '123';
    test('should fire redux action to open event details panel', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        result.current?.openEventDetailsPanel(testEventId);

        expect(mockDispatch).toHaveBeenCalled();
        expect(timelineActions.toggleDetailPanel).toHaveBeenCalled();
      });
    });

    test('should call provided onClose callback provided to openEventDetailsPanel fn', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        const mockOnClose = jest.fn();
        result.current?.openEventDetailsPanel(testEventId, mockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('should call the last onClose callback provided to openEventDetailsPanel fn', async () => {
      // Test that the onClose ref is properly updated
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        const mockOnClose = jest.fn();
        const secondMockOnClose = jest.fn();
        result.current?.openEventDetailsPanel(testEventId, mockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(mockOnClose).toHaveBeenCalled();

        result.current?.openEventDetailsPanel(testEventId, secondMockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(secondMockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('open host details', () => {
    const hostName = 'my-host';
    test('should fire redux action to open host details panel', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        result.current?.openHostDetailsPanel(hostName);

        expect(mockDispatch).toHaveBeenCalled();
        expect(timelineActions.toggleDetailPanel).toHaveBeenCalled();
      });
    });

    test('should call provided onClose callback provided to openEventDetailsPanel fn', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        const mockOnClose = jest.fn();
        result.current?.openHostDetailsPanel(hostName, mockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('should call the last onClose callback provided to openEventDetailsPanel fn', async () => {
      // Test that the onClose ref is properly updated
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        const mockOnClose = jest.fn();
        const secondMockOnClose = jest.fn();
        result.current?.openHostDetailsPanel(hostName, mockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(mockOnClose).toHaveBeenCalled();

        result.current?.openEventDetailsPanel(hostName, secondMockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(secondMockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('open network details', () => {
    const ip = '1.2.3.4';
    const flowTarget = FlowTargetSourceDest.source;
    test('should fire redux action to open host details panel', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        result.current?.openNetworkDetailsPanel(ip, flowTarget);

        expect(mockDispatch).toHaveBeenCalled();
        expect(timelineActions.toggleDetailPanel).toHaveBeenCalled();
      });
    });

    test('should call provided onClose callback provided to openEventDetailsPanel fn', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        const mockOnClose = jest.fn();
        result.current?.openNetworkDetailsPanel(ip, flowTarget, mockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('should call the last onClose callback provided to openEventDetailsPanel fn', async () => {
      // Test that the onClose ref is properly updated
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        const mockOnClose = jest.fn();
        const secondMockOnClose = jest.fn();
        result.current?.openNetworkDetailsPanel(ip, flowTarget, mockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(mockOnClose).toHaveBeenCalled();

        result.current?.openNetworkDetailsPanel(ip, flowTarget, secondMockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(secondMockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('open user details', () => {
    const userName = 'IAmBatman';
    test('should fire redux action to open host details panel', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        result.current?.openUserDetailsPanel(userName);

        expect(mockDispatch).toHaveBeenCalled();
        expect(timelineActions.toggleDetailPanel).toHaveBeenCalled();
      });
    });

    test('should call provided onClose callback provided to openEventDetailsPanel fn', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        const mockOnClose = jest.fn();
        result.current?.openUserDetailsPanel(userName, mockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('should call the last onClose callback provided to openEventDetailsPanel fn', async () => {
      // Test that the onClose ref is properly updated
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => {
          return useDetailPanel(defaultProps);
        });
        await waitForNextUpdate();

        const mockOnClose = jest.fn();
        const secondMockOnClose = jest.fn();
        result.current?.openUserDetailsPanel(userName, mockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(mockOnClose).toHaveBeenCalled();

        result.current?.openUserDetailsPanel(userName, secondMockOnClose);
        result.current?.handleOnDetailsPanelClosed();

        expect(secondMockOnClose).toHaveBeenCalled();
      });
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
          handleOnPanelClosed={[Function]}
          scopeId="timeline-test"
          tabType="session"
        />
      `);
    });
  });
});
