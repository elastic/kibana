/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { createLlmProxy, type LlmProxy } from '../../utils/create_llm_proxy';
import { createProxyActionConnector } from '../../utils/create_proxy_action_connector';
import { createOneChatApiClient } from '../../utils/http_client';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const oneChatApiClient = createOneChatApiClient(supertest);

  describe.skip('POST /api/chat/converse', function () {
    let proxy: LlmProxy;
    let connectorId: string;

    beforeEach(async () => {
      proxy = await createLlmProxy(log);
      connectorId = await createProxyActionConnector(getService, {
        port: proxy.getPort(),
      });
    });

    it('returns a response with expected shape for minimal request', async () => {
      const body = await oneChatApiClient.converse({
        input: 'Hello OneChat',
        connector_id: connectorId,
      });

      expect(body).to.have.property('conversation_id');
      expect(body).to.have.property('trace_id');
      expect(body).to.have.property('steps');
      expect(body).to.have.property('response');
      console.log(body);
    });
  });
}
