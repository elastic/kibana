/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useSyncToUrl } from '@kbn/url-state';
import { renderHook } from '@testing-library/react-hooks';
import { useSyncFlyoutStateWithUrl } from './use_sync_flyout_state_with_url';

jest.mock('@kbn/url-state');

describe('useSyncFlyoutStateWithUrl', () => {
  it('should return an array containing flyoutApi ref and handleFlyoutChanges function', () => {
    const { result } = renderHook(() => useSyncFlyoutStateWithUrl());
    const [flyoutApi, handleFlyoutChanges] = result.current;

    expect(flyoutApi.current).toBeNull();
    expect(typeof handleFlyoutChanges).toBe('function');
  });

  it('should open flyout when relevant url state is detected in the query string', () => {
    jest.useFakeTimers();

    jest.mocked(useSyncToUrl).mockImplementation((_urlKey, callback) => {
      setTimeout(() => callback({ mocked: { flyout: 'state' } }), 0);
      return jest.fn();
    });

    const { result } = renderHook(() => useSyncFlyoutStateWithUrl());
    const [flyoutApi, handleFlyoutChanges] = result.current;

    const flyoutApiMock: ExpandableFlyoutApi = {
      openFlyout: jest.fn(),
      getState: () => ({ left: undefined, right: undefined, preview: [] }),
    };

    expect(typeof handleFlyoutChanges).toBe('function');
    expect(flyoutApi.current).toBeNull();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (flyoutApi as any).current = flyoutApiMock;

    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    expect(flyoutApiMock.openFlyout).toHaveBeenCalledTimes(1);
    expect(flyoutApiMock.openFlyout).toHaveBeenCalledWith({ mocked: { flyout: 'state' } });
  });

  it('should sync flyout state to url whenever handleFlyoutChanges is called by the consumer', () => {
    const syncStateToUrl = jest.fn();
    jest.mocked(useSyncToUrl).mockImplementation((_urlKey, callback) => {
      setTimeout(() => callback({ mocked: { flyout: 'state' } }), 0);
      return syncStateToUrl;
    });

    const { result } = renderHook(() => useSyncFlyoutStateWithUrl());
    const [_flyoutApi, handleFlyoutChanges] = result.current;

    handleFlyoutChanges();

    expect(syncStateToUrl).toHaveBeenCalledTimes(1);
    expect(syncStateToUrl).toHaveBeenLastCalledWith(undefined);

    handleFlyoutChanges({ left: undefined, right: undefined, preview: [] });

    expect(syncStateToUrl).toHaveBeenLastCalledWith({
      left: undefined,
      right: undefined,
      preview: undefined,
    });
    expect(syncStateToUrl).toHaveBeenCalledTimes(2);
  });
});
