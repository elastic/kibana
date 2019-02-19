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
// @ts-ignore
import { mockMoment } from 'x-pack/plugins/apm/public/utils/testHelpers';
import { DatePicker } from '../DatePicker';

function mountPicker(search?: string) {
  const store = configureStore();
  const mounted = mount(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/whatever?${search}`]}>
        <DatePicker />
      </MemoryRouter>
    </Provider>
  );
  return { mounted, store };
}

describe('DatePicker', () => {
  const fakeNow = new Date('2019-02-15T12:00:00.000Z');
  const realDateNow = global.Date.now;

  beforeAll(() => {
    global.Date.now = jest.fn(() => fakeNow);
  });

  afterAll(() => {
    global.Date.now = realDateNow;
  });

  it('should initialize with APM default date range', () => {
    const { store } = mountPicker();
    expect(store.getState().urlParams).toEqual({
      start: '2019-02-14T12:00:00.000Z',
      end: '2019-02-15T12:00:00.000Z'
    });
  });

  it('should parse "last 15 minutes" from URL params', () => {
    const { store } = mountPicker('_g=(time:(from:now-15m,to:now))');
    expect(store.getState().urlParams).toEqual({
      start: '2019-02-15T11:45:00.000Z',
      end: '2019-02-15T12:00:00.000Z'
    });
  });

  it('should parse "last 7 days" from URL params', () => {
    const { store } = mountPicker('_g=(time:(from:now-7d,to:now))');
    expect(store.getState().urlParams).toEqual({
      start: '2019-02-08T12:00:00.000Z',
      end: '2019-02-15T12:00:00.000Z'
    });
  });

  it('should parse absolute dates from URL params', () => {
    const { store } = mountPicker(
      `_g=(time:(from:'2019-02-03T10:00:00.000Z',to:'2019-02-10T16:30:00.000Z'))`
    );
    expect(store.getState().urlParams).toEqual({
      start: '2019-02-03T10:00:00.000Z',
      end: '2019-02-10T16:30:00.000Z'
    });
  });
});
