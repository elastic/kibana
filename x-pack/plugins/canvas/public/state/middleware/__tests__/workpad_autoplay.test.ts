/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../lib/app_state');
jest.mock('../../../lib/router_provider');

import { workpadAutoplay } from '../workpad_autoplay';
import { setAutoplayInterval } from '../../../lib/app_state';
import { createTimeInterval } from '../../../lib/time_interval';
// @ts-expect-error untyped local
import { routerProvider } from '../../../lib/router_provider';

const next = jest.fn();
const dispatch = jest.fn();
const getState = jest.fn();
const routerMock = { navigateTo: jest.fn() };
routerProvider.mockReturnValue(routerMock);

const middleware = workpadAutoplay({ dispatch, getState })(next);

const workpadState = {
  persistent: {
    workpad: {
      id: 'workpad-id',
      pages: ['page1', 'page2', 'page3'],
      page: 0,
    },
  },
};

const autoplayState = {
  ...workpadState,
  transient: {
    autoplay: {
      inFlight: false,
      enabled: true,
      interval: 5000,
    },
    fullscreen: true,
  },
};

const autoplayDisabledState = {
  ...workpadState,
  transient: {
    autoplay: {
      inFlight: false,
      enabled: false,
      interval: 5000,
    },
  },
};

const action = {};

describe('workpad autoplay middleware', () => {
  beforeEach(() => {
    dispatch.mockClear();
    jest.resetAllMocks();
  });

  describe('app state', () => {
    it('sets the app state to the interval from state when enabled', () => {
      getState.mockReturnValue(autoplayState);
      middleware(action);

      expect(setAutoplayInterval).toBeCalledWith(
        createTimeInterval(autoplayState.transient.autoplay.interval)
      );
    });

    it('sets the app state to null when not enabled', () => {
      getState.mockReturnValue(autoplayDisabledState);
      middleware(action);

      expect(setAutoplayInterval).toBeCalledWith(null);
    });
  });

  describe('autoplay navigation', () => {
    it('navigates forward after interval', () => {
      jest.useFakeTimers();
      getState.mockReturnValue(autoplayState);
      middleware(action);

      jest.advanceTimersByTime(autoplayState.transient.autoplay.interval + 1);

      expect(routerMock.navigateTo).toBeCalledWith('loadWorkpad', {
        id: workpadState.persistent.workpad.id,
        page: workpadState.persistent.workpad.page + 2, // (index + 1) + 1 more for 1 indexed page number
      });

      jest.useRealTimers();
    });

    it('navigates from last page back to front', () => {
      jest.useFakeTimers();
      const onLastPageState = { ...autoplayState };
      onLastPageState.persistent.workpad.page = onLastPageState.persistent.workpad.pages.length - 1;

      getState.mockReturnValue(autoplayState);
      middleware(action);

      jest.advanceTimersByTime(autoplayState.transient.autoplay.interval + 1);

      expect(routerMock.navigateTo).toBeCalledWith('loadWorkpad', {
        id: workpadState.persistent.workpad.id,
        page: 1,
      });

      jest.useRealTimers();
    });

    it('continues autoplaying', () => {
      jest.useFakeTimers();
      getState.mockReturnValue(autoplayState);
      middleware(action);

      jest.advanceTimersByTime(autoplayState.transient.autoplay.interval * 2 + 1);
      expect(routerMock.navigateTo).toBeCalledTimes(2);
      jest.useRealTimers();
    });

    it('does not reset timer between middleware calls', () => {
      jest.useFakeTimers();

      getState.mockReturnValue(autoplayState);
      middleware(action);

      // Advance until right before timeout
      jest.advanceTimersByTime(autoplayState.transient.autoplay.interval - 1);

      // Run middleware again
      middleware(action);

      // Advance timer
      jest.advanceTimersByTime(1);

      expect(routerMock.navigateTo).toBeCalled();
    });
  });
});
