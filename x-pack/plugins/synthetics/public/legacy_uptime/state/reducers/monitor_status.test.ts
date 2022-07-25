/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Action } from 'redux-actions';

import { monitorStatusReducer, MonitorStatusState, MonitorStatusPayload } from './monitor_status';
import { getMonitorStatusAction } from '../actions/monitor_status';

describe('selectedFiltersReducer', () => {
  let state: MonitorStatusState;

  beforeEach(() => {
    state = {
      loading: false,
      status: {
        timestamp: '',
        docId: '',
        monitor: {
          id: 'testid',
          status: 'up',
          duration: {
            us: 1,
          },
          type: 'browser',
        },
      },
    };
  });

  describe('setSelectedFilters', () => {
    it('sets state to the action payload if state is null', () => {
      state.status = {
        timestamp: '',
        docId: '',
        monitor: {
          id: 'testid',
          status: 'up',
          duration: {
            us: 1,
          },
          type: 'browser',
        },
      };
      expect(
        monitorStatusReducer(
          state,
          getMonitorStatusAction({
            monitorId: 'testid2',
            dateStart: 'start',
            dateEnd: 'end',
          }) as Action<MonitorStatusPayload>
        )
      ).toEqual({
        loading: true,
        status: null,
      });
    });
  });
});
