/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type { ClusterClientMock } from '@kbn/core/server/mocks';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { getApmEventClient } from './get_apm_event_client';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

const apmIndices = {
  transaction: 'traces-apm*',
  span: 'traces-apm*',
  metric: 'metrics-apm*',
  error: 'logs-apm*',
} as APMIndices;

describe('getApmEventClient', () => {
  let coreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    coreStart = coreMock.createStart();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('scopes the Elasticsearch client without space CPS project routing', async () => {
    // No `x-project-routing` header → getProjectRoutingFromRequest returns undefined
    const request = httpServerMock.createKibanaRequest({ headers: {} });

    await getApmEventClient({
      request,
      context: coreMock.createCustomRequestHandlerContext(
        {}
      ) as unknown as MinimalAPMRouteHandlerResources['context'],
      core: { setup: {} as CoreSetup, start: async () => coreStart as unknown as CoreStart },
      params: { query: { _inspect: false } },
      getApmIndices: jest.fn().mockResolvedValue(apmIndices),
    });

    const { asScoped } = coreStart.elasticsearch.client as ClusterClientMock;
    expect(asScoped).toHaveBeenCalledTimes(1);
    expect(asScoped).toHaveBeenCalledWith(request);
    // Regression guard: no AsScopedOptions second argument
    expect(asScoped.mock.calls[0]).toHaveLength(1);
  });
});
