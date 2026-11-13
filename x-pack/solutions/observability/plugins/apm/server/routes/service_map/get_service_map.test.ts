/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ServiceMapGrouping } from '@kbn/apm-types';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import type { ServiceMapSpan } from '../../../common/service_map/types';
import { getServiceCallGraph } from './get_service_call_graph';
import { getServiceGroupingAttributes } from './get_service_grouping_attributes';
import { buildServiceGrouping } from './grouping/build_service_grouping';
import { getServiceMap } from './get_service_map';
import type { IEnvOptions, ServiceMapGroupingOptions } from './get_service_map';
import { DEFAULT_ANOMALIES, getServiceAnomalies } from './get_service_anomalies';
import { getServiceStats } from './get_service_stats';
import { getEnhancedServiceStats } from './get_enhanced_service_stats';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { fetchExitSpanSamplesFromTraceIds } from './fetch_exit_span_samples';

jest.mock('./get_service_call_graph');
jest.mock('./get_service_grouping_attributes');
jest.mock('./grouping/build_service_grouping');
jest.mock('./get_service_anomalies');
jest.mock('./get_service_stats');
jest.mock('./get_enhanced_service_stats');
jest.mock('./get_trace_sample_ids');
jest.mock('./fetch_exit_span_samples');

const getServiceCallGraphMock = jest.mocked(getServiceCallGraph);
const getServiceGroupingAttributesMock = jest.mocked(getServiceGroupingAttributes);
const buildServiceGroupingMock = jest.mocked(buildServiceGrouping);
const getServiceAnomaliesMock = jest.mocked(getServiceAnomalies);
const getServiceStatsMock = jest.mocked(getServiceStats);
const getEnhancedServiceStatsMock = jest.mocked(getEnhancedServiceStats);
const getTraceSampleIdsMock = jest.mocked(getTraceSampleIds);
const fetchExitSpanSamplesMock = jest.mocked(fetchExitSpanSamplesFromTraceIds);

const servicesData = [
  { [SERVICE_NAME]: 'gateway', [AGENT_NAME]: 'nodejs', [SERVICE_ENVIRONMENT]: 'production' },
  { [SERVICE_NAME]: 'cart', [AGENT_NAME]: 'nodejs', [SERVICE_ENVIRONMENT]: 'production' },
];

const spans: ServiceMapSpan[] = [
  {
    serviceName: 'gateway',
    agentName: 'nodejs',
    spanId: 'span-1',
    spanType: 'external',
    spanSubtype: 'http',
    spanDestinationServiceResource: 'cart-backend.default.svc:8080',
    destinationService: { serviceName: 'cart', agentName: 'nodejs' },
  },
];

const disabledGrouping: ServiceMapGroupingOptions = { enabled: false };

const enabledGrouping: ServiceMapGroupingOptions = {
  enabled: true,
  source: {
    documentType: ApmDocumentType.ServiceTransactionMetric,
    rollupInterval: RollupInterval.TenMinutes,
    useDurationSummary: true,
  },
};

function makeOptions(overrides: Partial<Parameters<typeof getServiceMap>[0]> = {}) {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;
  return {
    options: {
      apmEventClient: {} as IEnvOptions['apmEventClient'],
      config: {} as IEnvOptions['config'],
      environment: 'production',
      searchAggregatedTransactions: true,
      logger,
      start: 1,
      end: 2,
      maxNumberOfServices: 50,
      grouping: disabledGrouping,
      ...overrides,
    },
    logger,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getServiceStatsMock.mockResolvedValue(servicesData);
  getEnhancedServiceStatsMock.mockResolvedValue(servicesData);
  getServiceAnomaliesMock.mockResolvedValue(DEFAULT_ANOMALIES);
  getTraceSampleIdsMock.mockResolvedValue({ traceIds: ['trace-1'] });
  fetchExitSpanSamplesMock.mockResolvedValue(spans);
  getServiceCallGraphMock.mockResolvedValue({});
  getServiceGroupingAttributesMock.mockResolvedValue({});
  buildServiceGroupingMock.mockReturnValue(undefined);
});

const serviceGrouping: ServiceMapGrouping = {
  services: ['cart', 'gateway'],
  automatic: 'calls',
  strategies: [
    {
      source: 'calls',
      passes: true,
      groups: [{ id: 'notConnected', kind: 'notConnected' }],
      assignment: [0, 0],
    },
  ],
};

describe('getServiceMap services', () => {
  it('gets the services as before when grouping is disabled', async () => {
    const { options } = makeOptions({ grouping: disabledGrouping });

    await getServiceMap(options);

    expect(getServiceStatsMock).toHaveBeenCalledWith(options);
    expect(getEnhancedServiceStatsMock).not.toHaveBeenCalled();
  });

  it('gets the services with their stats when grouping is enabled', async () => {
    const { options } = makeOptions({ grouping: enabledGrouping });

    await getServiceMap(options);

    expect(getEnhancedServiceStatsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ...options, source: enabledGrouping.source })
    );
    expect(getServiceStatsMock).not.toHaveBeenCalled();
  });
});

describe('getServiceMap call graph', () => {
  it('does not read the call graph when grouping is off', async () => {
    const { options, logger } = makeOptions({ grouping: disabledGrouping });

    const map = await getServiceMap(options);

    expect(getServiceCallGraphMock).not.toHaveBeenCalled();
    expect(buildServiceGroupingMock).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
    });
  });

  it('does not read the call graph for one service', async () => {
    const { options } = makeOptions({ grouping: enabledGrouping, serviceName: 'cart' });

    await getServiceMap(options);

    expect(getServiceCallGraphMock).not.toHaveBeenCalled();
    expect(buildServiceGroupingMock).not.toHaveBeenCalled();
  });

  it('groups the services from the call graph and adds the grouping to the response', async () => {
    const callGraph = {
      gateway: [{ destination: 'cart-backend.default.svc:8080', calls: 4 }],
    };
    getServiceCallGraphMock.mockResolvedValue(callGraph);
    buildServiceGroupingMock.mockReturnValue(serviceGrouping);
    const { options, logger } = makeOptions({ grouping: enabledGrouping });

    const map = await getServiceMap(options);

    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
      serviceGrouping,
    });
    expect(buildServiceGroupingMock).toHaveBeenCalledWith({ callGraph, spans, servicesData });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('leaves the grouping off the response when there is none to show', async () => {
    const { options } = makeOptions({ grouping: enabledGrouping });

    const map = await getServiceMap(options);

    expect(buildServiceGroupingMock).toHaveBeenCalled();
    expect(map).not.toHaveProperty('serviceGrouping');
  });

  it('returns the map when the call graph query fails', async () => {
    getServiceCallGraphMock.mockRejectedValue(new Error('search failed'));
    const { options, logger } = makeOptions({ grouping: enabledGrouping });

    const map = await getServiceMap(options);

    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
    });
    expect(buildServiceGroupingMock).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Unable to retrieve the call graph for service maps.',
      { error: expect.any(Error) }
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('returns the map ungrouped and warns when grouping the services fails', async () => {
    getServiceCallGraphMock.mockResolvedValue({
      gateway: [{ destination: 'cart', calls: 1 }],
    });
    buildServiceGroupingMock.mockImplementation(() => {
      throw new Error('grouping failed');
    });
    const { options, logger } = makeOptions({ grouping: enabledGrouping });

    const map = await getServiceMap(options);

    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
    });
    expect(logger.warn).toHaveBeenCalledWith('Unable to group the services of the service map.', {
      error: expect.any(Error),
    });
  });
});

describe('getServiceMap grouping attributes', () => {
  it('does not read grouping attributes when grouping is off', async () => {
    const { options } = makeOptions({ grouping: disabledGrouping });

    await getServiceMap(options);

    expect(getServiceGroupingAttributesMock).not.toHaveBeenCalled();
  });

  it('does not read grouping attributes for one service', async () => {
    const { options } = makeOptions({ grouping: enabledGrouping, serviceName: 'cart' });

    await getServiceMap(options);

    expect(getServiceGroupingAttributesMock).not.toHaveBeenCalled();
  });

  it('reads grouping attributes and leaves the map response unchanged', async () => {
    getServiceGroupingAttributesMock.mockResolvedValue({
      gateway: { serviceNamespace: 'shop', kubernetesNamespace: 'team-gateway' },
      cart: { kubernetesNamespace: 'team-cart' },
    });
    const { options, logger } = makeOptions({ grouping: enabledGrouping });

    const map = await getServiceMap(options);

    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
    });
    expect(getServiceGroupingAttributesMock).toHaveBeenCalledWith({
      ...options,
      source: enabledGrouping.source,
    });
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('returns the map when grouping attributes fail', async () => {
    getServiceGroupingAttributesMock.mockRejectedValue(new Error('search failed'));
    const { options, logger } = makeOptions({ grouping: enabledGrouping });

    const map = await getServiceMap(options);

    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
    });
    expect(logger.debug).toHaveBeenCalledWith(
      'Unable to retrieve grouping attributes for service maps.',
      { error: expect.any(Error) }
    );
  });
});
