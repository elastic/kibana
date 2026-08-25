/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EdgeContents } from './edge_contents';
import type { ServiceMapEdge } from '../../../../../common/service_map';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
} from '@kbn/observability-shared-plugin/common';
import {
  SERVICE_NAME as SERVICE_NAME_FIELD,
  SPAN_DESTINATION_SERVICE_RESOURCE as SPAN_DESTINATION_SERVICE_RESOURCE_FIELD,
} from '../../../../../common/es_fields/apm';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { OpenInDiscover } from '../../../shared/links/discover_links/open_in_discover';

jest.mock('../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: jest.fn(),
}));

jest.mock('../../../shared/links/discover_links/open_in_discover', () => ({
  OpenInDiscover: jest.fn(() => (
    <button type="button" data-test-subj="apmEdgeContentsOpenInDiscoverButton">
      Explore traces
    </button>
  )),
}));

jest.mock('../../../../hooks/use_fetcher', () => ({
  FETCH_STATUS: { LOADING: 'loading', SUCCESS: 'success' },
  useFetcher: () => ({ data: {}, status: 'success' }),
}));

const mockedUseAnyOfApmParams = jest.mocked(useAnyOfApmParams);
const mockedOpenInDiscover = jest.mocked(OpenInDiscover);

const TEST_SUBJ = 'apmServiceMapMessagingEdgeNoMetricsMessage';

const defaultApmQuery = {
  comparisonEnabled: false,
  offset: undefined,
  rangeFrom: 'now-15m',
  rangeTo: 'now',
};

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

function createGroupedMessagingOutgoingEdge(): ServiceMapEdge {
  return {
    source: 'resourceGroup{order-service}',
    target: 'consumer-service',
    data: {
      isBidirectional: false,
      isGrouped: true,
    },
  } as unknown as ServiceMapEdge;
}

function createGroupedMessagingIncomingEdge(): ServiceMapEdge {
  return {
    source: 'producer-service',
    target: 'resourceGroup{order-service}',
    data: {
      isBidirectional: false,
      isGrouped: true,
    },
  } as unknown as ServiceMapEdge;
}

/** Edge with source service + dependency so Explore traces (OpenInDiscover) renders */
function createServiceToDependencyEdge(): ServiceMapEdge {
  return {
    source: 'order-service',
    target: '>kafka/orders',
    data: {
      sourceData: { [SERVICE_NAME_FIELD]: 'order-service' },
      targetData: { [SPAN_DESTINATION_SERVICE_RESOURCE_FIELD]: 'kafka/orders' },
      resources: ['kafka/orders'],
    },
  } as unknown as ServiceMapEdge;
}

describe('EdgeContents', () => {
  beforeEach(() => {
    mockedUseAnyOfApmParams.mockReturnValue({
      query: defaultApmQuery,
    } as unknown as ReturnType<typeof useAnyOfApmParams>);
    mockedOpenInDiscover.mockClear();
  });

  it('shows stats for a producer edge (service to messaging queue)', () => {
    const edge = createMsgQueueProducerEdge();

    render(
      <IntlProvider locale="en">
        <EdgeContents selection={edge} {...defaultProps} />
      </IntlProvider>
    );

    expect(screen.queryByTestId(TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('does not pass map search bar kuery to Explore traces (dependency metrics ignore KQL)', () => {
    mockedUseAnyOfApmParams.mockReturnValue({
      query: {
        ...defaultApmQuery,
        // Includes fields that overlap edge dimensions; must not be forwarded to Discover
        kuery: `${SERVICE_NAME_FIELD}: "order-service" and http.url: *`,
      },
    } as unknown as ReturnType<typeof useAnyOfApmParams>);

    const edge = createServiceToDependencyEdge();

    render(
      <IntlProvider locale="en">
        <EdgeContents selection={edge} {...defaultProps} />
      </IntlProvider>
    );

    expect(mockedOpenInDiscover).toHaveBeenCalledTimes(1);
    const [{ queryParams, rangeFrom, rangeTo }] = mockedOpenInDiscover.mock.calls[0];
    expect(queryParams).not.toHaveProperty('kuery');
    expect(queryParams).toEqual({
      serviceName: 'order-service',
      environment: 'ENVIRONMENT_ALL',
      dependencyName: 'kafka/orders',
      sortDirection: 'DESC',
    });
    expect(rangeFrom).toBe('now-15m');
    expect(rangeTo).toBe('now');
  });

  it('omits kuery from Explore traces when the map URL has no search bar filter', () => {
    const edge = createServiceToDependencyEdge();

    render(
      <IntlProvider locale="en">
        <EdgeContents selection={edge} {...defaultProps} />
      </IntlProvider>
    );

    expect(mockedOpenInDiscover).toHaveBeenCalledTimes(1);
    const [{ queryParams }] = mockedOpenInDiscover.mock.calls[0];
    expect(queryParams).not.toHaveProperty('kuery');
    expect(queryParams).toEqual({
      serviceName: 'order-service',
      environment: 'ENVIRONMENT_ALL',
      dependencyName: 'kafka/orders',
      sortDirection: 'DESC',
    });
  });

  it('shows no-metrics message for a consumer edge (messaging queue to service)', () => {
    const edge = createMsgQueueConsumerEdge();

    render(
      <IntlProvider locale="en">
        <EdgeContents selection={edge} {...defaultProps} />
      </IntlProvider>
    );

    expect(screen.getByTestId(TEST_SUBJ)).toBeInTheDocument();
  });

  it('shows no-metrics message for an outgoing edge from a grouped messaging node', () => {
    const edge = createGroupedMessagingOutgoingEdge();

    render(
      <IntlProvider locale="en">
        <EdgeContents selection={edge} {...defaultProps} />
      </IntlProvider>
    );

    expect(screen.getByTestId(TEST_SUBJ)).toBeInTheDocument();
  });

  it('shows no-metrics message for an incoming edge to a grouped messaging node', () => {
    const edge = createGroupedMessagingIncomingEdge();

    render(
      <IntlProvider locale="en">
        <EdgeContents selection={edge} {...defaultProps} />
      </IntlProvider>
    );

    expect(screen.getByTestId(TEST_SUBJ)).toBeInTheDocument();
  });
});
