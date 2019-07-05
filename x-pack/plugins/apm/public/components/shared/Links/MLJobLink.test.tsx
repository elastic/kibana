/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { Location } from 'history';
import React from 'react';
import { MLJobLink } from './MLJobLink';

describe('MLJobLink', () => {
  it('should render component', () => {
    const location = { search: '' } as Location;
    const wrapper = shallow(
      <MLJobLink
        serviceName="myServiceName"
        transactionType="myTransactionType"
        location={location}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should have correct path props', () => {
    const location = { search: '' } as Location;
    const wrapper = shallow(
      <MLJobLink
        serviceName="myServiceName"
        transactionType="myTransactionType"
        location={location}
      />
    );

    expect(wrapper.prop('href')).toBe(
      '/app/ml#/timeseriesexplorer?_g=(ml:(jobIds:!(myServiceName-myTransactionType-high_mean_response_time)),time:(from:now-24h,mode:quick,to:now))&_a='
    );
  });
});
