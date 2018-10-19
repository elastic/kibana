/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EnableMonitoringAlert } from './enable_monitoring_alert';

describe('EnableMonitoringAlert component', () => {
  it('renders expected component', () => {
    const wrapper = shallow(<EnableMonitoringAlert />);
    expect(wrapper).toMatchSnapshot();
  });
});
