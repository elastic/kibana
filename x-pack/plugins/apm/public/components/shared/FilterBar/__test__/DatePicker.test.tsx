/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
// @ts-ignore
import configureStore from 'x-pack/plugins/apm/public/store/config/configureStore';
import { mockNow } from 'x-pack/plugins/apm/public/utils/testHelpers';
import { DatePicker } from '../DatePicker';

function mountPicker(search?: string) {
  const store = configureStore();
  let path = '/whatever';
  if (search) {
    path += `?${search}`;
  }
  const mounted = mount(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <DatePicker />
      </MemoryRouter>
    </Provider>
  );
  return { mounted, store };
}

describe('DatePicker', () => {
  describe('date calculations', () => {
    let restoreNow: () => void;

    beforeAll(() => {
      restoreNow = mockNow('2019-02-15T12:00:00.000Z');
    });

    afterAll(() => {
      restoreNow();
    });

    it('should initialize with APM default date range', () => {
      const { store } = mountPicker();
      expect(store.getState().urlParams).toEqual({
        start: '2019-02-14T12:00:00.000Z',
        end: '2019-02-15T12:00:00.000Z'
      });
    });

    it('should parse "last 15 minutes" from URL params', () => {
      const { store } = mountPicker('rangeFrom=now-15m&rangeTo=now');
      expect(store.getState().urlParams).toEqual({
        start: '2019-02-15T11:45:00.000Z',
        end: '2019-02-15T12:00:00.000Z'
      });
    });

    it('should parse "last 7 days" from URL params', () => {
      const { store } = mountPicker('rangeFrom=now-7d&rangeTo=now');
      expect(store.getState().urlParams).toEqual({
        start: '2019-02-08T12:00:00.000Z',
        end: '2019-02-15T12:00:00.000Z'
      });
    });

    it('should parse absolute dates from URL params', () => {
      const { store } = mountPicker(
        `rangeFrom=2019-02-03T10:00:00.000Z&rangeTo=2019-02-10T16:30:00.000Z`
      );
      expect(store.getState().urlParams).toEqual({
        start: '2019-02-03T10:00:00.000Z',
        end: '2019-02-10T16:30:00.000Z'
      });
    });
  });

  describe('refresh cycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should refresh the store once per refresh interval', async () => {
      const { store } = mountPicker(
        'rangeFrom=now-15m&rangeTo=now&refreshPaused=false&refreshInterval=200'
      );
      const listener = jest.fn();
      store.subscribe(listener);
      jest.advanceTimersByTime(1100);

      expect(listener).toHaveBeenCalledTimes(5);
    });

    it('should not refresh when paused', async () => {
      const { store } = mountPicker(
        'rangeFrom=now-15m&rangeTo=now&refreshPaused=true&refreshInterval=200'
      );
      const listener = jest.fn();
      store.subscribe(listener);
      jest.advanceTimersByTime(1100);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should be paused by default', async () => {
      const { store } = mountPicker(
        'rangeFrom=now-15m&rangeTo=now&refreshInterval=200'
      );
      const listener = jest.fn();
      store.subscribe(listener);
      jest.advanceTimersByTime(1100);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not attempt refreshes after unmounting', async () => {
      const { store, mounted } = mountPicker(
        'rangeFrom=now-15m&rangeTo=now&refreshPaused=false&refreshInterval=200'
      );
      const listener = jest.fn();
      store.subscribe(listener);
      mounted.unmount();
      jest.advanceTimersByTime(1100);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
