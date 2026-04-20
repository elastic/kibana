/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { smlElasticsearchIndexMappings, smlIndexName } from '@kbn/agent-builder-plugin/server';
import type {
  SmlAttachHttpResponse,
  SmlSearchHttpResponse,
} from '@kbn/agent-builder-plugin/common/http_api/sml';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { createLlmProxy, type LlmProxy } from '../utils/llm_proxy';
import { setupAgentDirectAnswer } from '../utils/proxy_scenario';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/llm_proxy_action_connector';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const agentBuilderApiClient = createAgentBuilderApiClient(supertest);

  describe('SML internal API', function () {
    this.tags(['skipServerless']);

    describe('POST /internal/agent_builder/sml/_search', () => {
      const runId = uuidv4();
      const chunkId = `sml-ftr-autocomplete-${runId}`;
      const originId = `sml-ftr-origin-${runId}`;
      /** Distinctive title tokens for prefix search (SAYT + bool_prefix). */
      const indexedTitle = `sml ftr autocomplete pacific bluefin ${runId}`;

      before(async () => {
        const exists = await es.indices.exists({ index: smlIndexName });
        if (!exists) {
          await es.indices.create({
            index: smlIndexName,
            mappings: smlElasticsearchIndexMappings,
          });
        }

        const now = '2024-06-01T12:00:00.000Z';
        await es.index({
          index: smlIndexName,
          id: chunkId,
          refresh: 'wait_for',
          document: {
            id: chunkId,
            type: 'visualization',
            title: indexedTitle,
            origin_id: originId,
            content: 'pacific bluefin tuna content for sml ftr',
            created_at: now,
            updated_at: now,
            spaces: ['default'],
            permissions: [],
          },
        });
      });

      after(async () => {
        try {
          await es.delete({
            index: smlIndexName,
            id: chunkId,
            refresh: true,
          });
        } catch {
          // ignore cleanup failures
        }
      });

      it('returns a hit when query matches a partial word in the title (autocomplete)', async () => {
        const response = await supertest
          .post('/internal/agent_builder/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: 'pacif', size: 20 })
          .expect(200);

        const body = response.body as SmlSearchHttpResponse;
        expect(body.total).to.be.greaterThan(0);
        const match = body.results.find((r) => r.id === chunkId);
        expect(match).to.be.ok();
        expect(match!.title).to.contain('pacific');
        expect(match!.origin_id).to.be(originId);
        expect(match!.type).to.be('visualization');
      });

      it('returns total and results with the expected item fields (wildcard)', async () => {
        const response = await supertest
          .post('/internal/agent_builder/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: '*', size: 10 })
          .expect(200);

        const body = response.body as SmlSearchHttpResponse;

        expect(body).to.have.property('total');
        expect(body.total).to.be.a('number');
        expect(body).to.have.property('results');
        expect(body.results).to.be.an('array');

        for (const item of body.results) {
          expect(item).to.have.property('id');
          expect(item.id).to.be.a('string');
          expect(item).to.have.property('origin_id');
          expect(item).to.have.property('type');
          expect(item).to.have.property('title');
          expect(item).to.have.property('content');
          expect(item).to.have.property('score');
          expect(item.score).to.be.a('number');
        }
      });

      it('omits content on each hit when skip_content is true', async () => {
        const response = await supertest
          .post('/internal/agent_builder/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: '*', size: 10, skip_content: true })
          .expect(200);

        const body = response.body as SmlSearchHttpResponse;
        expect(body.results.length).to.be.greaterThan(0);
        for (const item of body.results) {
          expect(item).not.to.have.property('content');
        }
      });

      it('rejects an empty query string', async () => {
        await supertest
          .post('/internal/agent_builder/sml/_search')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ query: '' })
          .expect(400);
      });
    });

    describe('POST /internal/agent_builder/sml/_attach', () => {
      let llmProxy: LlmProxy;
      let connectorId: string;
      const runId = uuidv4();
      const chunkId = `sml-ftr-attach-${runId}`;
      const indexedTitle = `sml ftr attach ${runId}`;

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });

        const exists = await es.indices.exists({ index: smlIndexName });
        if (!exists) {
          await es.indices.create({
            index: smlIndexName,
            mappings: smlElasticsearchIndexMappings,
          });
        }

        const now = '2024-06-01T12:00:00.000Z';
        await es.index({
          index: smlIndexName,
          id: chunkId,
          refresh: 'wait_for',
          document: {
            id: chunkId,
            type: 'connector',
            title: indexedTitle,
            origin_id: connectorId,
            content: `attach content for ${runId}`,
            created_at: now,
            updated_at: now,
            spaces: ['default'],
            permissions: [],
          },
        });
      });

      after(async () => {
        llmProxy.close();
        await deleteActionConnector(getService, { actionId: connectorId });

        try {
          await es.delete({
            index: smlIndexName,
            id: chunkId,
            refresh: true,
          });
        } catch {
          // ignore cleanup failures
        }
      });

      it('returns 404 when the conversation does not exist', async () => {
        const response = await supertest
          .post('/internal/agent_builder/sml/_attach')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({
            conversation_id: 'non-existent-conversation-id-for-sml-attach-ftr',
            chunk_ids: ['irrelevant-chunk-id-for-sml-attach-ftr'],
          })
          .expect(404);

        expect(response.body).to.have.property('message');
      });

      it('attaches SML items and persists conversation attachment refs', async () => {
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: `SML attach title ${runId}`,
          response: 'SML attach response',
        });

        const converseResponse = await agentBuilderApiClient.converse({
          input: 'Create round for SML attach',
          attachments: [
            {
              type: 'text',
              data: {
                content: `existing text attachment ${runId}`,
              },
            },
          ],
          connector_id: connectorId,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const attachResponse = await supertest
          .post('/internal/agent_builder/sml/_attach')
          .set('kbn-xsrf', 'kibana')
          .set('x-elastic-internal-origin', 'kibana')
          .send({
            conversation_id: converseResponse.conversation_id,
            chunk_ids: [chunkId],
          })
          .expect(200);

        // Assert the attachment was created successfully
        const attachBody = attachResponse.body as SmlAttachHttpResponse;
        expect(attachBody.results).to.have.length(1);
        expect(attachBody.results[0].success).to.be(true);

        // Assert all attachments are present in the conversation
        const conversation = await agentBuilderApiClient.getConversation(
          converseResponse.conversation_id
        );
        const attachments = conversation.attachments ?? [];
        expect(attachments[0].type).to.be('text');
        expect(attachments[1].type).to.be('connector');

        // Assert the attachment refs are present
        const lastRound = conversation.rounds[conversation.rounds.length - 1];
        expect(lastRound.input.attachment_refs?.[0].attachment_id).to.be(attachments[0].id);
        expect(lastRound.input.attachment_refs?.[1].attachment_id).to.be(attachments[1].id);
      });
    });
  });
}
