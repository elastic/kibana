/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { smlElasticsearchIndexMappings, smlIndexName } from '@kbn/agent-builder-plugin/server';
import type { AgentBuilderApiFtrProviderContext } from '../../agent_builder/services/api';
import { createLlmProxy, type LlmProxy } from '../utils/llm_proxy';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/llm_proxy_action_connector';

export default function ({ getService }: AgentBuilderApiFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');

  describe('Connector lifecycle → SML indexing', function () {
    this.tags(['skipServerless']);

    let llmProxy: LlmProxy;

    before(async () => {
      const exists = await es.indices.exists({ index: smlIndexName });
      if (!exists) {
        await es.indices.create({
          index: smlIndexName,
          mappings: smlElasticsearchIndexMappings,
        });
      }

      llmProxy = await createLlmProxy(log);
    });

    after(async () => {
      llmProxy.close();
    });

    it('indexes the connector into SML when a connector is created', async () => {
      let connectorId: string | undefined;

      try {
        connectorId = await createLlmProxyActionConnector(getService, {
          port: llmProxy.getPort(),
        });

        // The SML indexing is async but happens synchronously within the lifecycle hook.
        // Retry search to account for ES indexing latency.
        let hit: unknown;
        for (let attempt = 0; attempt < 10; attempt++) {
          const result = await es.search({
            index: smlIndexName,
            query: { term: { origin_id: connectorId } },
          });
          if (result.hits.hits.length > 0) {
            hit = result.hits.hits[0];
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        expect(hit).to.be.ok();
        const source = (hit as any)._source;
        expect(source.origin_id).to.be(connectorId);
        expect(source.type).to.be('connector');
      } finally {
        if (connectorId) {
          await deleteActionConnector(getService, { actionId: connectorId });

          // Allow time for the SML delete to propagate
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Verify the connector was removed from SML
          try {
            await es.deleteByQuery({
              index: smlIndexName,
              query: { term: { origin_id: connectorId } },
              refresh: true,
            });
          } catch {
            // ignore cleanup failures
          }
        }
      }
    });

    it('removes the connector from SML when a connector is deleted', async () => {
      let connectorId: string | undefined;

      try {
        connectorId = await createLlmProxyActionConnector(getService, {
          port: llmProxy.getPort(),
        });

        const createdConnectorId = connectorId;

        // Wait for create indexing
        for (let attempt = 0; attempt < 10; attempt++) {
          const result = await es.search({
            index: smlIndexName,
            query: { term: { origin_id: createdConnectorId } },
          });
          if (result.hits.hits.length > 0) break;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Now delete the connector and verify removal
        await deleteActionConnector(getService, { actionId: createdConnectorId });
        connectorId = undefined;

        // The delete is also async-ish; retry to confirm removal
        let removed = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          const result = await es.search({
            index: smlIndexName,
            query: { term: { origin_id: createdConnectorId } },
          });
          if (result.hits.hits.length === 0) {
            removed = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        expect(removed).to.be(true);
      } finally {
        if (connectorId) {
          await deleteActionConnector(getService, { actionId: connectorId });
          try {
            await es.deleteByQuery({
              index: smlIndexName,
              query: { term: { origin_id: connectorId } },
              refresh: true,
            });
          } catch {
            // ignore cleanup failures
          }
        }
      }
    });
  });
}
