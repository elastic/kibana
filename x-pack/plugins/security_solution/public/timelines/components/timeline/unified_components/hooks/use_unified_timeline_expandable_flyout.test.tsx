/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { useLocation } from 'react-router-dom';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { useUnifiedTableExpandableFlyout } from './use_unified_timeline_expandable_flyout';

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
  beforeEach(() => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useUiSetting$ as jest.Mock).mockReturnValue([true, jest.fn()]);
    (useLocation as jest.Mock).mockReturnValue({
      search: `?${URL_PARAM_KEY.timelineFlyout}=(test:value)`,
    });
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
      openFlyout: jest.fn(),
      closeFlyout: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should have expandable flyout disabled when flyout is disabled in Advanced Settings', () => {
    (useUiSetting$ as jest.Mock).mockReturnValue([false, jest.fn()]);
    const { result } = renderHook(() =>
      useUnifiedTableExpandableFlyout({
        onClose: onFlyoutCloseMock,
      })
    );

    expect(result.current.isTimelineExpandableFlyoutEnabled).toBe(false);
  });
  it('should have expandable flyout disabled when flyout is disabled in Experimental Features', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() =>
      useUnifiedTableExpandableFlyout({
        onClose: onFlyoutCloseMock,
      })
    );

    expect(result.current.isTimelineExpandableFlyoutEnabled).toBe(false);
  });
  describe('when flyout is enabled', () => {
    it('should mark flyout as closed when location is empty', () => {
      (useLocation as jest.Mock).mockReturnValue({
        search: '',
      });

      const { result } = renderHook(() =>
        useUnifiedTableExpandableFlyout({
          onClose: onFlyoutCloseMock,
        })
      );

      expect(result.current.isTimelineExpandableFlyoutOpen).toBe(false);
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

      expect(result.current.isTimelineExpandableFlyoutOpen).toBe(true);
    });

    it('should mark flyout as close when location has  empty `timelineFlyout`', () => {
      const { result, rerender } = renderHook(() =>
        useUnifiedTableExpandableFlyout({
          onClose: onFlyoutCloseMock,
        })
      );
      expect(result.current.isTimelineExpandableFlyoutOpen).toBe(true);

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
