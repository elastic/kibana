/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { NetworkRequestsTotal } from './network_requests_total';
import { render } from '../../../../../lib/helper/rtl_helpers';

describe('NetworkRequestsTotal', () => {
  it('message in case total is greater than fetched', () => {
    const { getByText, getByLabelText } = render(
      <NetworkRequestsTotal fetchedNetworkRequests={1000} totalNetworkRequests={1100} />
    );

    expect(getByText('First 1000/1100 network requests')).toBeInTheDocument();
    expect(getByLabelText('Info')).toBeInTheDocument();
  });

  it('message in case total is equal to fetched requests', () => {
    const { getByText } = render(
      <NetworkRequestsTotal fetchedNetworkRequests={500} totalNetworkRequests={500} />
    );

    expect(getByText('500 network requests')).toBeInTheDocument();
  });
});
