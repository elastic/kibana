/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { NoServicesMessage } from '../NoServicesMessage';

describe('NoServicesMessage', () => {
  it('should show only a "not found" message when historical data is found', () => {
    const wrapper = shallow(<NoServicesMessage historicalDataFound={true} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should show a "no services installed" message, a link to the set up instructions page, a message about upgrading APM server, and a link to the upgrade assistant when NO historical data is found', () => {
    const wrapper = shallow(<NoServicesMessage historicalDataFound={false} />);
    expect(wrapper).toMatchSnapshot();
  });
});
