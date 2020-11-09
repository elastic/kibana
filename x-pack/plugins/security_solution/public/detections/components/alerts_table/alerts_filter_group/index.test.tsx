/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AlertsTableFilterGroup } from './index';

describe('AlertsTableFilterGroup', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<AlertsTableFilterGroup onFilterGroupChanged={jest.fn()} />);

    expect(wrapper.find('EuiFilterButton')).toBeTruthy();
  });
});
