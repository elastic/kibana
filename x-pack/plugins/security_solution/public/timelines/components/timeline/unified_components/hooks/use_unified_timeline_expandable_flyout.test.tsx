/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useUnifiedTableExpandableFlyout } from './use_unified_timeline_expandable_flyout';
import { useLocation } from 'react-router-dom';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('react-router-dom', () => {
  return {
    useLocation: jest.fn(),
  };
});
jest.mock('@kbn/expandable-flyout');

const onFlyoutCloseMock = jest.fn();

describe('useUnifiedTimelineExpandableFlyout', () => {
  describe('when expandable flyout is enabled', () => {
    beforeEach(() => {
      (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
        openFlyout: jest.fn(),
        closeFlyout: jest.fn(),
      });

      (useLocation as jest.Mock).mockReturnValue({
        search: `${URL_PARAM_KEY.timelineFlyout}=(test:value)`,
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should mark flyout as close when location has  empty `timelineFlyout`', () => {
      const { result, rerender } = renderHook(() =>
        useUnifiedTableExpandableFlyout({
          onClose: onFlyoutCloseMock,
        })
      );

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
