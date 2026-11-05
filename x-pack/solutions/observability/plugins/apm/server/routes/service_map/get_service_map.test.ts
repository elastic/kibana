/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import type { ServiceMapSpan } from '../../../common/service_map/types';
import { getServiceCallGraph } from './get_service_call_graph';
import { matchCallGraphToServices } from './match_service_call_graph';
import { getServiceMap } from './get_service_map';
import type { IEnvOptions } from './get_service_map';
import { DEFAULT_ANOMALIES, getServiceAnomalies } from './get_service_anomalies';
import { getServiceStats } from './get_service_stats';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { fetchExitSpanSamplesFromTraceIds } from './fetch_exit_span_samples';

jest.mock('./get_service_call_graph');
jest.mock('./match_service_call_graph');
jest.mock('./get_service_anomalies');
jest.mock('./get_service_stats');
jest.mock('./get_trace_sample_ids');
jest.mock('./fetch_exit_span_samples');

const getServiceCallGraphMock = jest.mocked(getServiceCallGraph);
const matchCallGraphToServicesMock = jest.mocked(matchCallGraphToServices);
const getServiceAnomaliesMock = jest.mocked(getServiceAnomalies);
const getServiceStatsMock = jest.mocked(getServiceStats);
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

function makeOptions(
  overrides: Partial<IEnvOptions & { maxNumberOfServices: number; groupingEnabled?: boolean }> = {}
) {
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
      ...overrides,
    },
    logger,
  };
}

describe('getServiceMap call graph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getServiceStatsMock.mockResolvedValue(servicesData);
    getServiceAnomaliesMock.mockResolvedValue(DEFAULT_ANOMALIES);
    getTraceSampleIdsMock.mockResolvedValue({ traceIds: ['trace-1'] });
    fetchExitSpanSamplesMock.mockResolvedValue(spans);
    matchCallGraphToServicesMock.mockReturnValue({});
  });

  it('does not read the call graph when grouping is off', async () => {
    const { options, logger } = makeOptions({ groupingEnabled: false });

    const map = await getServiceMap(options);

    expect(getServiceCallGraphMock).not.toHaveBeenCalled();
    expect(matchCallGraphToServicesMock).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
    });
  });

  it('does not read the call graph for one service', async () => {
    const { options } = makeOptions({ groupingEnabled: true, serviceName: 'cart' });

    await getServiceMap(options);

    expect(getServiceCallGraphMock).not.toHaveBeenCalled();
    expect(matchCallGraphToServicesMock).not.toHaveBeenCalled();
  });

  it('resolves the call graph and leaves the map response unchanged', async () => {
    const callGraph = {
      gateway: [{ destination: 'cart-backend.default.svc:8080', calls: 4 }],
    };
    getServiceCallGraphMock.mockResolvedValue(callGraph);
    const { options, logger } = makeOptions({ groupingEnabled: true });

    const map = await getServiceMap(options);

    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
    });
    expect(matchCallGraphToServicesMock).toHaveBeenCalledWith({
      callGraph,
      spans,
      serviceNames: ['gateway', 'cart'],
    });
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('returns the map when the call graph query fails', async () => {
    getServiceCallGraphMock.mockRejectedValue(new Error('search failed'));
    const { options, logger } = makeOptions({ groupingEnabled: true });

    const map = await getServiceMap(options);

    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
    });
    expect(matchCallGraphToServicesMock).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Unable to retrieve the call graph for service maps.',
      { error: expect.any(Error) }
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('returns the map when matching the call graph fails', async () => {
    getServiceCallGraphMock.mockResolvedValue({
      gateway: [{ destination: 'cart', calls: 1 }],
    });
    matchCallGraphToServicesMock.mockImplementation(() => {
      throw new Error('match failed');
    });
    const { options, logger } = makeOptions({ groupingEnabled: true });

    const map = await getServiceMap(options);

    expect(map).toEqual({
      spans,
      tracesCount: 1,
      servicesData,
      anomalies: DEFAULT_ANOMALIES,
    });
    expect(logger.debug).toHaveBeenCalledWith('Unable to match the call graph for service maps.', {
      error: expect.any(Error),
    });
  });
});
