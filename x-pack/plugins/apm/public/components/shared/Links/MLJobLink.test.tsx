/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { Location } from 'history';
import React from 'react';
import { getRenderedHref } from 'x-pack/plugins/apm/public/utils/testHelpers';
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

  it('should produce the correct URL', async () => {
    const location = { search: '?rangeFrom=now/w&rangeTo=now-4h' } as Location;
    const href = await getRenderedHref(() => (
      <MLJobLink
        serviceName="myServiceName"
        transactionType="myTransactionType"
        location={location}
      />
    ));

    expect(href).toEqual(
      `/app/ml#/timeseriesexplorer?_g=(ml:(jobIds:!(myservicename-mytransactiontype-high_mean_response_time)),refreshInterval:(pause:true,value:'0'),time:(from:now%2Fw,to:now-4h))`
    );
  });
});
