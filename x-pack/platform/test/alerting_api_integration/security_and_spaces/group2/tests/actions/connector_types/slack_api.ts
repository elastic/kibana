/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function slackTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Slack API action', () => {
    it('should return 200 when creating a slack action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack api action',
          connector_type_id: '.slack_api',
          secrets: {
            token: 'some token',
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        is_missing_secrets: false,
        name: 'A slack api action',
        connector_type_id: '.slack_api',
        config: {},
        is_connector_type_deprecated: false,
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        is_missing_secrets: false,
        name: 'A slack api action',
        connector_type_id: '.slack_api',
        config: {},
        is_connector_type_deprecated: false,
      });
    });

    it('should respond with a 400 Bad Request when creating a slack action with no token', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack api action',
          connector_type_id: '.slack_api',
          secrets: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: `error validating connector type secrets: Field \"token\": Required`,
          });
        });
    });

    it('should create a slack connector with allowedChannels name only', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack api action',
          connector_type_id: '.slack_api',
          config: {
            allowedChannels: [
              {
                name: '#general',
              },
            ],
          },
          secrets: {
            token: 'some token',
          },
        })
        .expect(200);

      expect(createdAction.config.allowedChannels).to.eql([{ name: '#general' }]);
    });

    it('should respond with a 400 Bad Request when creating a slack action with allowedChannels but name is missing', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack api action',
          connector_type_id: '.slack_api',
          config: {
            allowedChannels: [
              {
                id: '#general-1',
              },
            ],
          },
          secrets: {
            token: 'some token',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating connector type config: Field "allowedChannels.0.name": Required',
          });
        });
    });
  });
}
