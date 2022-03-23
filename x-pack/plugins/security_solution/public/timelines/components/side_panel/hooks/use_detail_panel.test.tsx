/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useDetailPanel, UseDetailPanelConfig } from './use_detail_panel';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { TimelineId } from '../../../../../common/types';

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
jest.mock('../../../../common/containers/sourcerer', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    browserFields: {},
    docValueFields: [],
    loading: true,
    indexPattern: {},
    selectedPatterns: [],
    missingPatterns: [],
  }),
}));

describe('useHoverActionItems', () => {
  const defaultProps: UseDetailPanelConfig = {
    sourcererScope: SourcererScopeName.detections,
    timelineId: TimelineId.test,
  };

  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockImplementation((cb) => {
      return {};
    });
  });
  afterEach(() => {
    (useDeepEqualSelector as jest.Mock).mockClear();
  });

  test('should return expected options when given required props', async () => {
    const testEventId = '123';
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        return useDetailPanel(defaultProps);
      });
      await waitForNextUpdate();
      result.current?.openDetailsPanel(testEventId);

      expect(mockDispatch).toHaveBeenCalled();
      expect(result.current.shouldShowFlyoutDetailsPanel).toBe(false);
      expect(result.current.FlyoutDetailsPanel).toBeTruthy();
    });
  });
});
