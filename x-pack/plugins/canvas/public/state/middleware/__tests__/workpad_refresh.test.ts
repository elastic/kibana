/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/new_platform'); // actions/elements has some dependencies on ui/new_platform.
jest.mock('../../../lib/app_state');

import { workpadRefresh } from '../workpad_refresh';
import { inFlightComplete } from '../../actions/resolved_args';
import { setRefreshInterval } from '../../actions/workpad';
import { setRefreshInterval as setAppStateRefreshInterval } from '../../../lib/app_state';

import { createTimeInterval } from '../../../lib/time_interval';

const next = jest.fn();
const dispatch = jest.fn();
const getState = jest.fn();

const middleware = workpadRefresh({ dispatch, getState })(next);

const refreshState = {
  transient: {
    refresh: {
      interval: 5000,
    },
  },
};

const noRefreshState = {
  transient: {
    refresh: {
      interval: 0,
    },
  },
};

const inFlightState = {
  transient: {
    refresh: {
      interval: 5000,
    },
    inFlight: true,
  },
};

describe('workpad refresh middleware', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('onInflightComplete', () => {
    it('refreshes if interval gt 0', () => {
      jest.useFakeTimers();
      getState.mockReturnValue(refreshState);

      middleware(inFlightComplete());

      jest.runAllTimers();

      expect(dispatch).toHaveBeenCalled();
    });

    it('does not reset interval if another action occurs', () => {
      jest.useFakeTimers();
      getState.mockReturnValue(refreshState);

      middleware(inFlightComplete());

      jest.advanceTimersByTime(refreshState.transient.refresh.interval - 1);

      expect(dispatch).not.toHaveBeenCalled();
      middleware(inFlightComplete());

      jest.advanceTimersByTime(1);

      expect(dispatch).toHaveBeenCalled();
    });

    it('does not refresh if interval is 0', () => {
      jest.useFakeTimers();
      getState.mockReturnValue(noRefreshState);

      middleware(inFlightComplete());

      jest.runAllTimers();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('setRefreshInterval', () => {
    it('does nothing if refresh interval is unchanged', () => {
      getState.mockReturnValue(refreshState);

      jest.useFakeTimers();
      const interval = 1;
      middleware(setRefreshInterval(interval));
      jest.runAllTimers();

      expect(setAppStateRefreshInterval).not.toBeCalled();
    });

    it('sets the app refresh interval', () => {
      getState.mockReturnValue(noRefreshState);
      next.mockImplementation(() => {
        getState.mockReturnValue(refreshState);
      });

      jest.useFakeTimers();
      const interval = 1;
      middleware(setRefreshInterval(interval));

      expect(setAppStateRefreshInterval).toBeCalledWith(createTimeInterval(interval));
      jest.runAllTimers();
    });

    it('starts a refresh for the new interval', () => {
      getState.mockReturnValue(refreshState);
      jest.useFakeTimers();

      const interval = 1000;

      middleware(inFlightComplete());

      jest.runTimersToTime(refreshState.transient.refresh.interval - 1);
      expect(dispatch).not.toBeCalled();

      getState.mockReturnValue(noRefreshState);
      next.mockImplementation(() => {
        getState.mockReturnValue(refreshState);
      });
      middleware(setRefreshInterval(interval));
      jest.runTimersToTime(1);

      expect(dispatch).not.toBeCalled();

      jest.runTimersToTime(interval);
      expect(dispatch).toBeCalled();
    });
  });

  describe('inFlight in progress', () => {
    it('requeues the refresh when inflight is active', () => {
      jest.useFakeTimers();
      getState.mockReturnValue(inFlightState);

      middleware(inFlightComplete());
      jest.runTimersToTime(refreshState.transient.refresh.interval);

      expect(dispatch).not.toBeCalled();

      getState.mockReturnValue(refreshState);
      jest.runAllTimers();

      expect(dispatch).toBeCalled();
    });
  });
});
