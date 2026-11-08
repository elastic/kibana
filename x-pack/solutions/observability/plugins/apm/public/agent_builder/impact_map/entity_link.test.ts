/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmEntityLinkResolver } from './entity_link';

const callApmApi = jest.fn();
const resolve = createApmEntityLinkResolver({
  prependBasePath: (path) => `/base${path}`,
  getCallApmApi: () => callApmApi as never,
});

beforeEach(() => callApmApi.mockReset());

describe('createApmEntityLinkResolver', () => {
  it('links a service APM knows to its overview, by its service.name when it has one', async () => {
    callApmApi.mockResolvedValue({ agentName: 'java' });

    expect(
      await resolve({
        id: 'shipping',
        label: 'Shipping',
        kind: 'service',
        metadata: [{ key: 'service.name', value: 'shipping' }],
      })
    ).toEqual({ href: '/base/app/apm/services/shipping/overview', label: 'Open in APM' });
    expect(callApmApi.mock.calls[0][1].params.path).toEqual({ serviceName: 'shipping' });
  });

  it('gives no link for a service APM has not seen', async () => {
    callApmApi.mockResolvedValue({});

    expect(await resolve({ id: 'quote-old', label: 'quote-old', kind: 'service' })).toBeUndefined();
  });

  it('does not ask about entities that are not services', async () => {
    expect(await resolve({ id: 'db', label: 'db', kind: 'dependency' })).toBeUndefined();
    expect(callApmApi).not.toHaveBeenCalled();
  });
});
