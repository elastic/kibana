/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates agent configuration documents at a regular interval.
 */

import type { AgentConfigFields } from '@kbn/synthtrace-client';
import { observer } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';

const scenario: Scenario<AgentConfigFields> = async ({ logger }) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const agentConfig = observer().agentConfig();

      return withClient(
        apmEsClient,
        range
          .interval('30s')
          .rate(1)
          .generator((timestamp) => {
            const events = logger.perf('generating_agent_config_events', () => {
              return agentConfig.etag('test-etag').timestamp(timestamp);
            });
            return events;
          })
      );
    },
  };
};

export default scenario;
