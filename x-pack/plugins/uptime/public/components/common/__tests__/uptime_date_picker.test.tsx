/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as reactRedux from 'react-redux';
import { UptimeDatePicker } from '../uptime_date_picker';
import { renderWithRouter, shallowWithRouter, MountWithReduxProvider } from '../../../lib';

describe('UptimeDatePicker component', () => {
  beforeAll(() => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockReturnValue({
      autorefreshInterval: 60000,
      autorefreshIsPaused: false,
      dateRange: {
        from: 'now-15m',
        to: 'now',
      },
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('validates props with shallow render', () => {
    const component = shallowWithRouter(<UptimeDatePicker />);
    expect(component).toMatchSnapshot();
  });

  it('renders properly with mock data', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider>
        <UptimeDatePicker />
      </MountWithReduxProvider>
    );
    expect(component).toMatchSnapshot();
  });
});
