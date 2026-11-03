/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  CUSTOMER0_CONNECTOR_IDS,
  EVALS_TELEMETRY_CONNECTOR_ID,
  assignInvestigatorConnectors,
} from './investigator_connectors';

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

describe('assignInvestigatorConnectors', () => {
  const env = { NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://telemetry.example.com' };

  it('assigns the customer0 investigator connectors and keeps the rest of the saved agent', async () => {
    const fetch = fetchAgent();

    await assignInvestigatorConnectors(fetch, {
      orca: false,
      dataset: { name: 'ns-investigation-golden', tags: ['customer0'] },
      env,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toBe('/api/agent_builder/agents/nightshift.investigation');
    expect(putBody(fetch as unknown as jest.Mock)).toEqual({
      configuration: {
        ...savedAgent.configuration,
        connector_ids: [...CUSTOMER0_CONNECTOR_IDS],
      },
    });
  });

  it('assigns only the ORCA telemetry connector on the ORCA shard', async () => {
    const fetch = fetchAgent();

    await assignInvestigatorConnectors(fetch, {
      orca: true,
      dataset: { name: 'nightshift/orca-sampled50-v2' },
      env,
    });

    expect(putBody(fetch as unknown as jest.Mock).configuration.connector_ids).toEqual([
      EVALS_TELEMETRY_CONNECTOR_ID,
    ]);
  });

  it('assigns only the customer0 Elasticsearch connector for other remote datasets', async () => {
    const fetch = fetchAgent();

    await assignInvestigatorConnectors(fetch, {
      orca: false,
      dataset: { name: 'nightshift/synthetic' },
      env,
    });

    expect(putBody(fetch as unknown as jest.Mock).configuration.connector_ids).toEqual(['c0-es']);
  });

  it('does nothing when the run has no remote telemetry', async () => {
    const fetch = jest.fn();

    await assignInvestigatorConnectors(fetch as unknown as HttpHandler, {
      orca: false,
      dataset: { name: 'nightshift/customer0/incidents', tags: ['customer0'] },
      env: {},
    });

    expect(fetch).not.toHaveBeenCalled();
  });
});
