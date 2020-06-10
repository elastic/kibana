/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { MonitorStatusRow } from '../monitor_status_row';

describe('MonitorStatusRow component', () => {
  let locationNames: Set<string>;

  beforeEach(() => {
    locationNames = new Set(['Berlin', 'Islamabad', 'London']);
  });

  it('renders status row when status is up', () => {
    const component = shallowWithIntl(
      <MonitorStatusRow locationNames={locationNames} status={'Up'} />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders status row when status is down', () => {
    const component = shallowWithIntl(
      <MonitorStatusRow locationNames={locationNames} status={'Down'} />
    );
    expect(component).toMatchSnapshot();
  });
});
