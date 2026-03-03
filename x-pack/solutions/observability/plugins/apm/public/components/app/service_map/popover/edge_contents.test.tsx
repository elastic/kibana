/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EdgeContents } from './edge_contents';
import type { ServiceMapEdge } from '../../../../../common/service_map';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
} from '@kbn/observability-shared-plugin/common';

jest.mock('../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: { comparisonEnabled: false, offset: undefined },
  }),
}));

jest.mock('../../../../hooks/use_fetcher', () => ({
  FETCH_STATUS: { LOADING: 'loading', SUCCESS: 'success' },
  useFetcher: () => ({ data: {}, status: 'success' }),
}));

const defaultProps = {
  environment: 'ENVIRONMENT_ALL' as const,
  start: '2026-01-01T00:00:00.000Z',
  end: '2026-01-01T01:00:00.000Z',
};

function createMsgQueueProducerEdge(): ServiceMapEdge {
  return {
    source: 'order-service',
    target: '>kafka/orders',
    data: {
      sourceData: { [SERVICE_NAME]: 'order-service' },
      resources: ['kafka/orders'],
    },
  } as unknown as ServiceMapEdge;
}

function createMsgQueueConsumerEdge(): ServiceMapEdge {
  return {
    source: '>kafka/orders',
    target: 'payment-service',
    data: {
      sourceData: {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'kafka/orders',
        [SPAN_TYPE]: 'messaging',
      },
      resources: [],
    },
  } as unknown as ServiceMapEdge;
}

describe('EdgeContents', () => {
  it('shows stats for a msg queue producer edge (service to msg queue)', () => {
    const edge = createMsgQueueProducerEdge();

    render(<EdgeContents selection={edge} {...defaultProps} />);

    expect(
      screen.queryByTestId('apmServiceMapConsumerEdgeInformationMessage')
    ).not.toBeInTheDocument();
  });

  it('shows information message for a msg queue consumer edge (msg queue to service)', () => {
    const edge = createMsgQueueConsumerEdge();

    render(<EdgeContents selection={edge} {...defaultProps} />);

    expect(screen.getByTestId('apmServiceMapConsumerEdgeInformationMessage')).toBeInTheDocument();
  });
});
