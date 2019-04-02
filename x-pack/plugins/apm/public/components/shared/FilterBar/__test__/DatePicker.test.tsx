/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { Store } from 'redux';
// @ts-ignore
import configureStore from '../../../../store/config/configureStore';
import { mockNow, tick } from '../../../../utils/testHelpers';
import { DatePicker, DatePickerComponent } from '../DatePicker';

function mountPicker(initialState = {}) {
  const store = configureStore(initialState);
  const wrapper = mount(
    <Provider store={store}>
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    </Provider>
  );
  return { wrapper, store };
}

describe('DatePicker', () => {
  describe('url updates', () => {
    function setupTest() {
      const routerProps = {
        location: { search: '' },
        history: { push: jest.fn() }
      } as any;

      const wrapper = shallow<DatePickerComponent>(
        <DatePickerComponent
          {...routerProps}
          dispatchUpdateTimePicker={jest.fn()}
          urlParams={{}}
        />
      );

      return { history: routerProps.history, wrapper };
    }

    it('should push an entry to the stack for each change', () => {
      const { history, wrapper } = setupTest();
      wrapper.instance().updateUrl({ rangeFrom: 'now-20m', rangeTo: 'now' });
      expect(history.push).toHaveBeenCalledWith({
        search: 'rangeFrom=now-20m&rangeTo=now'
      });
    });
  });

  describe('refresh cycle', () => {
    let nowSpy: jest.Mock;
    beforeEach(() => {
      nowSpy = mockNow('2010');
      jest.useFakeTimers();
    });

    afterEach(() => {
      nowSpy.mockRestore();
      jest.useRealTimers();
    });

    describe('when refresh is not paused', () => {
      let listener: jest.Mock;
      let store: Store;
      beforeEach(async () => {
        const obj = mountPicker({
          urlParams: {
            rangeFrom: 'now-15m',
            rangeTo: 'now',
            refreshPaused: false,
            refreshInterval: 200
          }
        });
        store = obj.store;

        listener = jest.fn();
        store.subscribe(listener);

        jest.advanceTimersByTime(200);
        await tick();
        jest.advanceTimersByTime(200);
        await tick();
        jest.advanceTimersByTime(200);
        await tick();
      });

      it('should dispatch every refresh interval', async () => {
        expect(listener).toHaveBeenCalledTimes(3);
      });

      it('should update the store with the new date range', () => {
        expect(store.getState().urlParams).toEqual({
          end: '2010-01-01T00:00:00.000Z',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          refreshInterval: 200,
          refreshPaused: false,
          start: '2009-12-31T23:45:00.000Z'
        });
      });
    });

    it('should not refresh when paused', () => {
      const { store } = mountPicker({
        urlParams: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          refreshPaused: true,
          refreshInterval: 200
        }
      });

      const listener = jest.fn();
      store.subscribe(listener);
      jest.advanceTimersByTime(1100);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should be paused by default', () => {
      const { store } = mountPicker({
        urlParams: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          refreshInterval: 200
        }
      });

      const listener = jest.fn();
      store.subscribe(listener);
      jest.advanceTimersByTime(1100);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not attempt refreshes after unmounting', () => {
      const { store, wrapper } = mountPicker({
        urlParams: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          refreshPaused: false,
          refreshInterval: 200
        }
      });

      const listener = jest.fn();
      store.subscribe(listener);
      wrapper.unmount();
      jest.advanceTimersByTime(1100);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
