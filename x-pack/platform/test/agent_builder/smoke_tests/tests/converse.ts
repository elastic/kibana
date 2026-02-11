/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { isToolCallStep, platformCoreTools } from '@kbn/agent-builder-common';
import type {
  ChatRequestBodyPayload,
  ChatResponse,
} from '@kbn/agent-builder-plugin/common/http_api/chat';
import type { FtrProviderContext } from '../ftr_provider_context';

export const converseApiSuite = (
  name: string,
  connectorId: string | (() => string),
  { getService }: FtrProviderContext
) => {
  const supertest = getService('supertest');
  const resolveConnectorId = () => (typeof connectorId === 'string' ? connectorId : connectorId());

  const converse = async <T = ChatResponse>(
    payload: ChatRequestBodyPayload,
    statusCode = 200
  ): Promise<T> => {
    const res = await supertest
      .post('/api/agent_builder/converse')
      .set('kbn-xsrf', 'true')
      .send(payload)
      .expect(statusCode);
    return res.body as T;
  };

  describe(`Connector: ${name}`, () => {
    it('returns an answer for a simple message', async () => {
      const response = await converse({
        input: 'Hello',
        connector_id: resolveConnectorId(),
      });
      expect(response.response.message!.length).to.be.greaterThan(0);
    });

    it('can execute a tool', async () => {
      const response = await converse({
        input: `Using the "platform_core_list_indices" tool, please list my indices. Only call the tool once.`,
        connector_id: resolveConnectorId(),
      });
      expect(response.response.message!.length).to.be.greaterThan(0);
      const toolCalls = response.steps.filter(isToolCallStep);
      expect(toolCalls.length >= 1).to.be(true);
      expect(toolCalls[0].tool_id).to.eql(platformCoreTools.listIndices);
    });

    it('can continue a text conversation', async () => {
      const id = resolveConnectorId();
      const response1 = await converse({
        input: 'Please say "hello"',
        connector_id: id,
      });
      expect(response1.response.message!.length).to.be.greaterThan(0);

      const response2 = await converse({
        conversation_id: response1.conversation_id,
        input: 'Please say it again.',
        connector_id: id,
      });
      expect(response2.response.message!.length).to.be.greaterThan(0);
    });
  });
};
