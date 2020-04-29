/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { UptimeDatePicker } from '../uptime_date_picker';
import { renderWithRouter, shallowWithRouter } from '../../../lib';

describe('UptimeDatePicker component', () => {
  it('validates props with shallow render', () => {
    const component = shallowWithRouter(<UptimeDatePicker />);
    expect(component).toMatchSnapshot();
  });

  it('renders properly with mock data', () => {
    const component = renderWithRouter(<UptimeDatePicker />);
    expect(component).toMatchSnapshot();
  });
});
