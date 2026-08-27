/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function slackTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Slack API action', () => {
    it('should reject creating a V1 Slack API connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack api action',
          connector_type_id: '.slack_api',
          config: {},
          secrets: {
            token: 'some token',
          },
        })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'New connectors of action type .slack_api cannot be created.',
        });
    });
  });
}
