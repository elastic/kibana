/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { EVALS_TELEMETRY_CONNECTOR_ID, assignTelemetryConnector } from './investigator_connectors';

describe('assignTelemetryConnector', () => {
  it('saves the telemetry connector on the investigator agent like a user would', async () => {
    const fetch = jest.fn().mockResolvedValue({});

    await assignTelemetryConnector(fetch as unknown as HttpHandler, {
      NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL: 'https://telemetry.example.com',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [path, options] = fetch.mock.calls[0];
    expect(path).toBe('/api/agent_builder/agents/nightshift.investigation');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({
      configuration: { connector_ids: [EVALS_TELEMETRY_CONNECTOR_ID] },
    });
  });

  it('does nothing when the run has no remote telemetry', async () => {
    const fetch = jest.fn();

    await assignTelemetryConnector(fetch as unknown as HttpHandler, {});

    expect(fetch).not.toHaveBeenCalled();
  });
});
