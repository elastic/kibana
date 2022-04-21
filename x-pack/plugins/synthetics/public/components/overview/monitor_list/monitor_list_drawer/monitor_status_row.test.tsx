/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../lib/helper/rtl_helpers';
import { MonitorStatusRow } from './monitor_status_row';

describe('MonitorStatusRow component', () => {
  it.each(['Up'])('renders status row when status is up', (expectedStatus) => {
    const locationNames = new Set(['Berlin', 'Islamabad', 'London']);
    const { getByLabelText } = render(
      <MonitorStatusRow locationNames={locationNames} status={expectedStatus} />
    );

    const locationElement = getByLabelText(
      `A list of locations with "${expectedStatus}" status when last checked.`
    );

    expect(locationElement.innerHTML).toBe('Berlin, Islamabad, London');
  });

  it('renders an empty set string', () => {
    const { getByText } = render(<MonitorStatusRow locationNames={new Set()} status="Down" />);

    expect(getByText('--'));
  });
});
