/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PayloadAction } from '@reduxjs/toolkit';
import moment from 'moment';

import { contextMiddleware } from '.';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { applyChanges, initialState } from '../lens_slice';
import { LensAppState } from '../types';
import { mockDataPlugin, mockStoreDeps } from '../../mocks';

const storeDeps = mockStoreDeps();
const createMiddleware = (data: DataPublicPluginStart, state?: Partial<LensAppState>) => {
  const middleware = contextMiddleware({
    ...storeDeps,
    lensServices: {
      ...storeDeps.lensServices,
      data,
    },
  });
  const store = {
    getState: jest.fn(() => ({ lens: state || initialState })),
    dispatch: jest.fn(),
  };
  const next = jest.fn();

  const invoke = (action: PayloadAction<Partial<LensAppState> | void>) =>
    middleware(store)(next)(action);

  return { store, next, invoke };
};

describe('contextMiddleware', () => {
  describe('time update', () => {
    it('does update the searchSessionId when the state changes and too much time passed', () => {
      const data = mockDataPlugin();
      storeDeps.datasourceMap.testDatasource.isTimeBased = () => true;
      (data.nowProvider.get as jest.Mock).mockReturnValue(new Date(Date.now() - 30000));
      (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
        from: 'now-2m',
        to: 'now',
      });
      (data.query.timefilter.timefilter.getBounds as jest.Mock).mockReturnValue({
        min: moment(Date.now() - 100000),
        max: moment(Date.now() - 30000),
      });
      const { next, invoke, store } = createMiddleware(data);
      const action = {
        type: 'lens/setState',
        payload: {
          visualization: {
            state: {},
            activeId: 'id2',
          },
        },
      };
      invoke(action);
      expect(store.dispatch).toHaveBeenCalledWith({
        payload: {
          resolvedDateRange: {
            fromDate: '2021-01-10T04:00:00.000Z',
            toDate: '2021-01-10T08:00:00.000Z',
          },
          searchSessionId: 'sessionId-1',
        },
        type: 'lens/setState',
      });
      expect(next).toHaveBeenCalledWith(action);
    });
    it('does not update the searchSessionId when current state is not time based', () => {
      const data = mockDataPlugin();
      storeDeps.datasourceMap.testDatasource.isTimeBased = () => false;
      (data.nowProvider.get as jest.Mock).mockReturnValue(new Date(Date.now() - 30000));
      (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
        from: 'now-2m',
        to: 'now',
      });
      (data.query.timefilter.timefilter.getBounds as jest.Mock).mockReturnValue({
        min: moment(Date.now() - 100000),
        max: moment(Date.now() - 30000),
      });
      const { next, invoke, store } = createMiddleware(data);
      const action = {
        type: 'lens/setState',
        payload: {
          visualization: {
            state: {},
            activeId: 'id2',
          },
        },
      };
      invoke(action);
      expect(store.dispatch).toHaveBeenCalledWith({
        payload: {
          resolvedDateRange: {
            fromDate: '2021-01-10T04:00:00.000Z',
            toDate: '2021-01-10T08:00:00.000Z',
          },
          searchSessionId: 'sessionId-1',
        },
        type: 'lens/setState',
      });
      expect(next).toHaveBeenCalledWith(action);
    });
    describe('when auto-apply is disabled', () => {
      it('only updates searchSessionId when user applies changes', () => {
        // setup
        const data = mockDataPlugin();
        (data.nowProvider.get as jest.Mock).mockReturnValue(new Date(Date.now() - 30000));
        (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
          from: 'now-2m',
          to: 'now',
        });
        (data.query.timefilter.timefilter.getBounds as jest.Mock).mockReturnValue({
          min: moment(Date.now() - 100000),
          max: moment(Date.now() - 30000),
        });
        const { invoke, store } = createMiddleware(data, {
          ...initialState,
          autoApplyDisabled: true,
        });

        // setState shouldn't trigger
        const setStateAction = {
          type: 'lens/setState',
          payload: {
            visualization: {
              state: {},
              activeId: 'id2',
            },
          },
        };
        invoke(setStateAction);
        expect(store.dispatch).not.toHaveBeenCalledWith(
          expect.objectContaining({ type: 'lens/setState' })
        );

        // applyChanges should trigger
        const applyChangesAction = applyChanges();
        invoke(applyChangesAction);
        expect(store.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'lens/setState' })
        );
      });
    });
    it('does not update the searchSessionId when the state changes and too little time has passed', () => {
      const data = mockDataPlugin();
      // time range is 100,000ms ago to 300ms ago (that's a lag of .3 percent, not enough to trigger a session update)
      (data.nowProvider.get as jest.Mock).mockReturnValue(new Date(Date.now() - 300));
      (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
        from: 'now-2m',
        to: 'now',
      });
      (data.query.timefilter.timefilter.getBounds as jest.Mock).mockReturnValue({
        min: moment(Date.now() - 100000),
        max: moment(Date.now() - 300),
      });
      const { next, invoke, store } = createMiddleware(data);
      const action = {
        type: 'lens/setState',
        payload: {
          visualization: {
            state: {},
            activeId: 'id2',
          },
        },
      };
      invoke(action);
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(action);
    });
    it('does not trigger another update when the update already contains searchSessionId', () => {
      const data = mockDataPlugin();
      (data.nowProvider.get as jest.Mock).mockReturnValue(new Date(Date.now() - 30000));
      (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
        from: 'now-2m',
        to: 'now',
      });
      (data.query.timefilter.timefilter.getBounds as jest.Mock).mockReturnValue({
        min: moment(Date.now() - 100000),
        max: moment(Date.now() - 30000),
      });
      const { next, invoke, store } = createMiddleware(data);
      const action = {
        type: 'lens/setState',
        payload: {
          visualization: {
            state: {},
            activeId: 'id2',
          },
          searchSessionId: 'searchSessionId',
        },
      };
      invoke(action);
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(action);
    });

    it('does not trigger another update on active data update', () => {
      const data = mockDataPlugin();
      (data.nowProvider.get as jest.Mock).mockReturnValue(new Date(Date.now() - 30000));
      (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
        from: 'now-2m',
        to: 'now',
      });
      (data.query.timefilter.timefilter.getBounds as jest.Mock).mockReturnValue({
        min: moment(Date.now() - 100000),
        max: moment(Date.now() - 30000),
      });
      const { next, invoke, store } = createMiddleware(data);
      const action = {
        type: 'lens/onActiveDataChange',
        payload: {},
      };
      invoke(action);
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(action);
    });
  });
});
