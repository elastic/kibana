/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { registerDataProviders } from './register_data_providers';
import { getApmServiceSummary } from './get_apm_service_summary';
import { getExitSpanChangePoints, getServiceChangePoints } from './get_change_points';
import { buildApmToolResources } from '../utils/build_apm_tool_resources';

jest.mock('./get_apm_service_summary');
jest.mock('./get_change_points');
jest.mock('../utils/build_apm_tool_resources');

const apmEventClient = {} as any;
const apmAlertsClient = {} as any;
const mlClient = {} as any;
const esClientAsCurrentUser = {} as any;

(buildApmToolResources as jest.Mock).mockResolvedValue({
  apmEventClient,
  apmAlertsClient,
  mlClient,
  esClient: { asCurrentUser: esClientAsCurrentUser },
  randomSamplerSeed: 1,
});

// These are the three data providers whose underlying functions had their
// `arguments`/params type switched from io-ts's `t.TypeOf` to zod's
// `z.infer` as part of elastic/kibana#243355. They're only reachable via
// the agent chat engine calling the tool by name, not via any HTTP route,
// so this is the only repeatable way to verify the agent-supplied args are
// still mapped onto the (now zod-typed) function signatures correctly.
describe('registerDataProviders (apmServiceSummary / apmServiceChangePoints / apmExitSpanChangePoints)', () => {
  const registerDataProvider = jest.fn();
  const mockRequest = {} as any;

  function getRegisteredProvider(name: string) {
    const call = registerDataProvider.mock.calls.find(([providerName]) => providerName === name);
    if (!call) {
      throw new Error(`No data provider registered under "${name}"`);
    }
    return call[1] as (args: any) => Promise<unknown>;
  }

  beforeAll(() => {
    registerDataProviders({
      core: {} as any,
      plugins: { observabilityAgentBuilder: { registerDataProvider } } as any,
      config: {} as any,
      logger: { get: () => ({} as Logger) } as unknown as Logger,
    });
  });

  it('registers all three providers', () => {
    expect(registerDataProvider).toHaveBeenCalledWith('apmServiceSummary', expect.any(Function));
    expect(registerDataProvider).toHaveBeenCalledWith(
      'apmExitSpanChangePoints',
      expect.any(Function)
    );
    expect(registerDataProvider).toHaveBeenCalledWith(
      'apmServiceChangePoints',
      expect.any(Function)
    );
  });

  it('apmServiceSummary maps its agent-supplied args onto getApmServiceSummary', async () => {
    const provider = getRegisteredProvider('apmServiceSummary');

    await provider({
      request: mockRequest,
      serviceName: 'opbeans-java',
      serviceEnvironment: 'production',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      transactionType: 'request',
    });

    expect(getApmServiceSummary).toHaveBeenCalledWith({
      apmEventClient,
      esClient: esClientAsCurrentUser,
      apmAlertsClient,
      mlClient,
      logger: expect.anything(),
      arguments: {
        'service.name': 'opbeans-java',
        'service.environment': 'production',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-02T00:00:00.000Z',
        'transaction.type': 'request',
      },
    });
  });

  it('apmExitSpanChangePoints maps its agent-supplied args onto getExitSpanChangePoints', async () => {
    const provider = getRegisteredProvider('apmExitSpanChangePoints');

    await provider({
      request: mockRequest,
      serviceName: 'opbeans-java',
      serviceEnvironment: 'production',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });

    expect(getExitSpanChangePoints).toHaveBeenCalledWith({
      apmEventClient,
      serviceName: 'opbeans-java',
      serviceEnvironment: 'production',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });
  });

  it('apmServiceChangePoints maps its agent-supplied args onto getServiceChangePoints', async () => {
    const provider = getRegisteredProvider('apmServiceChangePoints');

    await provider({
      request: mockRequest,
      serviceName: 'opbeans-java',
      serviceEnvironment: 'production',
      transactionType: 'request',
      transactionName: 'GET /api',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });

    expect(getServiceChangePoints).toHaveBeenCalledWith({
      apmEventClient,
      serviceName: 'opbeans-java',
      serviceEnvironment: 'production',
      transactionType: 'request',
      transactionName: 'GET /api',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });
  });
});
