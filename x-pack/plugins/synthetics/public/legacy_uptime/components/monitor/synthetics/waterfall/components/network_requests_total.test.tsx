/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NetworkRequestsTotal } from './network_requests_total';
import { render } from '../../../../../lib/helper/rtl_helpers';

describe('NetworkRequestsTotal', () => {
  it('message in case total is greater than fetched', () => {
    const { getByText } = render(
      <NetworkRequestsTotal
        fetchedNetworkRequests={1000}
        totalNetworkRequests={1100}
        highlightedNetworkRequests={1000}
      />
    );

    expect(getByText('First 1000/1100 network requests')).toBeInTheDocument();
    expect(getByText('Info')).toBeInTheDocument();
  });

  it('message in case total is equal to fetched requests', () => {
    const { getByText } = render(
      <NetworkRequestsTotal
        fetchedNetworkRequests={500}
        totalNetworkRequests={500}
        highlightedNetworkRequests={1000}
      />
    );

    expect(getByText('500 network requests')).toBeInTheDocument();
  });

  it('does not show highlighted item message when showHighlightedNetworkEvents is false', () => {
    const { queryByText } = render(
      <NetworkRequestsTotal
        fetchedNetworkRequests={500}
        totalNetworkRequests={500}
        highlightedNetworkRequests={0}
        showHighlightedNetworkRequests={false}
      />
    );

    expect(queryByText(/match the filter/)).not.toBeInTheDocument();
  });

  it('does not show highlighted item message when highlightedNetworkEvents is less than 0', () => {
    const { queryByText } = render(
      <NetworkRequestsTotal
        fetchedNetworkRequests={500}
        totalNetworkRequests={500}
        highlightedNetworkRequests={-1}
        showHighlightedNetworkRequests={false}
      />
    );

    expect(queryByText(/match the filter/)).not.toBeInTheDocument();
  });

  it('show highlighted item message when highlightedNetworkEvents is greater than 0 and showHighlightedNetworkEvents is true', () => {
    const { getByText } = render(
      <NetworkRequestsTotal
        fetchedNetworkRequests={500}
        totalNetworkRequests={500}
        highlightedNetworkRequests={20}
        showHighlightedNetworkRequests={true}
      />
    );

    expect(getByText(/\(20 match the filter\)/)).toBeInTheDocument();
  });
});
