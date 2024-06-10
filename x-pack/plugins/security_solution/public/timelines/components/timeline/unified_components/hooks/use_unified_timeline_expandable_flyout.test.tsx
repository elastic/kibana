/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { renderHook } from '@testing-library/react-hooks';
import { useUnifiedTableExpandableFlyout } from './use_unified_timeline_expandable_flyout';
import { useLocation } from 'react-router-dom';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

jest.mock('../../../../../common/hooks/use_experimental_features');
jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('react-router-dom', () => {
  return {
    useLocation: jest.fn(),
  };
});
jest.mock('@kbn/expandable-flyout');

const onFlyoutCloseMock = jest.fn();

describe('useUnifiedTimelineExpandableFlyout', () => {
  it('should disable expandable flyout when expandableFlyoutDisabled flag is true', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useLocation as jest.Mock).mockReturnValue({
      search: `?${URL_PARAM_KEY.timelineFlyout}=(test:value)`,
    });
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
      openFlyout: jest.fn(),
      closeFlyout: jest.fn(),
    });

    const { result } = renderHook(() =>
      useUnifiedTableExpandableFlyout({
        onClose: onFlyoutCloseMock,
      })
    );

    expect(result.current.isExpandableFlyoutDisabled).toBe(true);
  });

  describe('when expandable flyout is enabled', () => {
    beforeEach(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should mark flyout as closed when location is empty', () => {
      (useLocation as jest.Mock).mockReturnValue({
        search: '',
      });

      const { result } = renderHook(() =>
        useUnifiedTableExpandableFlyout({
          onClose: onFlyoutCloseMock,
        })
      );

      expect(result.current.isExpandableFlyoutDisabled).toBe(false);
    });

    it('should mark flyout as open when location has `timelineFlyout`', () => {
      (useLocation as jest.Mock).mockReturnValue({
        search: `${URL_PARAM_KEY.timelineFlyout}=(test:value)`,
      });

      const { result } = renderHook(() =>
        useUnifiedTableExpandableFlyout({
          onClose: onFlyoutCloseMock,
        })
      );

      expect(result.current.isExpandableFlyoutDisabled).toBe(false);
    });

    it('should mark flyout as close when location has  empty `timelineFlyout`', () => {
      const { result, rerender } = renderHook(() =>
        useUnifiedTableExpandableFlyout({
          onClose: onFlyoutCloseMock,
        })
      );

      expect(result.current.isExpandableFlyoutDisabled).toBe(false);

      (useLocation as jest.Mock).mockReturnValue({
        search: `${URL_PARAM_KEY.timelineFlyout}=()`,
      });

      rerender();

      expect(result.current.isTimelineExpandableFlyoutOpen).toBe(false);
      expect(onFlyoutCloseMock).toHaveBeenCalledTimes(1);
    });

    it('should call user provided close handler when flyout is closed', () => {
      const { result } = renderHook(() =>
        useUnifiedTableExpandableFlyout({
          onClose: onFlyoutCloseMock,
        })
      );

      result.current.closeFlyout();

      expect(onFlyoutCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
