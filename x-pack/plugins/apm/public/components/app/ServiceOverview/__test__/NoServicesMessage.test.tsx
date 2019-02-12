/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { NoServicesMessage } from '../NoServicesMessage';

describe('No Services Message', () => {
  it('should render correctly when historical data is found', () => {
    const wrapper = shallow(<NoServicesMessage historicalDataFound={true} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly when NO historical data is found', () => {
    const wrapper = shallow(<NoServicesMessage historicalDataFound={false} />);
    expect(wrapper).toMatchSnapshot();
  });
});
