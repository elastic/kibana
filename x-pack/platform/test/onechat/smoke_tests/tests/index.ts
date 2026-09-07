/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import type { FtrProviderContext } from '../ftr_provider_context';
import { converseApiSuite } from './converse';

const EXCLUDED_STATIC_CONNECTOR_IDS = new Set<string>([
  'bedrock-claude-sonnet-3-7',
  'bedrock-claude-sonnet-4-5',
]);

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  describe('Agent Builder - LLM Smoke tests', async () => {
    const connectors = getAvailableConnectors().filter(
      (c) => !EXCLUDED_STATIC_CONNECTOR_IDS.has(c.id)
    );

    connectors.forEach((connector) => {
      describe(`Connector "${connector.id}"`, () => {
        converseApiSuite(connector, providerContext);
      });
    });
  });
}
