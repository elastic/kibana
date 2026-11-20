/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { CONNECTOR_SETS, getConnectorSet, saveConnectorSetOnInvestigator } from './connector_sets';

const savedAgent = {
  configuration: {
    tools: [{ tool_ids: ['nightshift_sandbox_bash'] }],
    skill_ids: ['kept'],
    connector_ids: ['old'],
  },
};

const fetchAgent = () => {
  const fetch = jest
    .fn()
    .mockImplementation(async (_path: string, options?: { method?: string }) => {
      if (options?.method === 'PUT') return {};
      return savedAgent;
    });
  return fetch as unknown as HttpHandler & jest.Mock;
};

const putBody = (fetch: jest.Mock) => {
  const put = fetch.mock.calls.find(([, options]) => options?.method === 'PUT');
  return JSON.parse(put?.[1].body);
};

describe('saveConnectorSetOnInvestigator', () => {
  it('saves the default set and keeps the rest of the saved agent', async () => {
    const fetch = fetchAgent();

    await saveConnectorSetOnInvestigator(fetch, { env: { NIGHTSHIFT_CONNECTOR_SET: 'default' } });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toBe('/api/agent_builder/agents/nightshift.investigation');
    expect(putBody(fetch as unknown as jest.Mock)).toEqual({
      configuration: {
        ...savedAgent.configuration,
        connector_ids: ['elasticsearch'],
      },
    });
  });

  it('saves only the ORCA Elasticsearch connector for the orcabench set', async () => {
    const fetch = fetchAgent();

    await saveConnectorSetOnInvestigator(fetch, { env: { NIGHTSHIFT_CONNECTOR_SET: 'orcabench' } });

    expect(putBody(fetch as unknown as jest.Mock).configuration.connector_ids).toEqual([
      ...CONNECTOR_SETS.orcabench,
    ]);
  });

  // A later dataset on the same stack must not inherit an earlier one's connectors.
  it('saves no connectors for a dataset that must not reach the stack clusters', async () => {
    const fetch = fetchAgent();

    await saveConnectorSetOnInvestigator(fetch, {
      env: { NIGHTSHIFT_CONNECTOR_SET: 'default' },
      withoutConnectors: true,
    });

    expect(putBody(fetch as unknown as jest.Mock)).toEqual({
      configuration: { ...savedAgent.configuration, connector_ids: [] },
    });
  });

  it('does nothing when the stack has no connector set', async () => {
    const fetch = jest.fn();

    await saveConnectorSetOnInvestigator(fetch as unknown as HttpHandler, { env: {} });

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('getConnectorSet', () => {
  it('rejects a set the suite does not define', () => {
    expect(() => getConnectorSet({ NIGHTSHIFT_CONNECTOR_SET: 'toString' })).toThrow(
      'Unknown NIGHTSHIFT_CONNECTOR_SET: toString'
    );
  });
});
