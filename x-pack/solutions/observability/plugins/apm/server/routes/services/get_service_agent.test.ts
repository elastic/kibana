/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import {
  AGENT_NAME,
  TELEMETRY_SDK_NAME,
  TELEMETRY_SDK_LANGUAGE,
} from '../../../common/es_fields/apm';
import { getServiceAgent } from './get_service_agent';

type SearchMock = jest.Mock<Promise<unknown>>;

const start = 1_700_000_000_000;
const end = 1_700_000_900_000;

const baseParams = {
  serviceName: 'my-service',
  start,
  end,
};

function hitResponse(fields: Record<string, unknown[]>) {
  return {
    hits: {
      total: { value: 1 },
      hits: [{ fields }],
    },
  };
}

function emptyResponse() {
  return {
    hits: {
      total: { value: 0 },
      hits: [],
    },
  };
}

function getSearchParams(search: SearchMock, callIndex = 0) {
  return search.mock.calls[callIndex]?.[1];
}

describe('getServiceAgent', () => {
  it('synthesizes the agent name from telemetry SDK fields for native OTel services', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(
      hitResponse({
        [TELEMETRY_SDK_NAME]: ['opentelemetry'],
        [TELEMETRY_SDK_LANGUAGE]: ['java'],
      })
    );
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getServiceAgent({ ...baseParams, apmEventClient });

    expect(result.agentName).toBe('opentelemetry/java');
    expect(result.telemetrySdkName).toBe('opentelemetry');
    expect(result.telemetrySdkLanguage).toBe('java');
  });

  it('returns the classic APM agent name verbatim when agent.name exists', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(
      hitResponse({
        [AGENT_NAME]: ['java'],
      })
    );
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getServiceAgent({ ...baseParams, apmEventClient });

    expect(result.agentName).toBe('java');
  });

  it('matches documents that have agent.name or telemetry SDK fields', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(emptyResponse());
    const apmEventClient = { search } as unknown as APMEventClient;

    await getServiceAgent({ ...baseParams, apmEventClient });

    const filters = getSearchParams(search)?.query?.bool?.filter ?? [];
    const agentIdentityFilter = filters.find(
      (f: Record<string, unknown>) =>
        typeof f.bool === 'object' &&
        f.bool !== null &&
        'minimum_should_match' in (f.bool as object)
    );

    expect(agentIdentityFilter).toEqual({
      bool: {
        should: [
          { exists: { field: AGENT_NAME } },
          { exists: { field: TELEMETRY_SDK_NAME } },
          { exists: { field: TELEMETRY_SDK_LANGUAGE } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('returns an empty object when there is no hit', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(emptyResponse());
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getServiceAgent({ ...baseParams, apmEventClient });

    expect(result).toEqual({});
  });
});
