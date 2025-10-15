/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ObjectRemover } from '../../../../../common/lib';
import { Superuser, GlobalRead, StackAlertsOnly } from '../../../../scenarios';
import type { User } from '../../../../../common/types';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function getWebhookSecretHeaderKeys({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get secrets keys from connectors route', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should return the secrets keys correctly for a webhook connector', async () => {
      const connector = await createWebhookConnector({ superSecretKey: 'superSecretValue' });
      const secretKeys = await getSecretHeadersKeys(connector.id, Superuser);

      objectRemover.add('default', connector.id, 'connector', 'actions');

      expect(secretKeys).to.eql(['superSecretKey']);
    });

    it('should return the secrets keys correctly for a cases webhook connector', async () => {
      const connector = await createCasesWebhookConnector({ superSecretKey: 'superSecretValue' });
      const secretKeys = await getSecretHeadersKeys(connector.id, Superuser);

      objectRemover.add('default', connector.id, 'connector', 'actions');

      expect(secretKeys).to.eql(['superSecretKey']);
    });

    it('should throw a bad request if the connector is not a webhook or a cases webhoook connector', async () => {
      const connector = await createServerLogConnector();
      await getSecretHeadersKeys(connector.id, Superuser, 400);

      objectRemover.add('default', connector.id, 'connector', 'actions');
    });

    describe('permissions', () => {
      it('a user with read access to actions should read the secret headers', async () => {
        const connector = await createWebhookConnector({ superSecretKey: 'superSecretValue' });
        const secretKeys = await getSecretHeadersKeys(connector.id, GlobalRead, 200);

        objectRemover.add('default', connector.id, 'connector', 'actions');

        expect(secretKeys).to.eql(['superSecretKey']);
      });

      it('a user without access to connectors should not get the secret headers', async () => {
        const connector = await createWebhookConnector({ superSecretKey: 'superSecretValue' });
        await getSecretHeadersKeys(connector.id, StackAlertsOnly, 403);

        objectRemover.add('default', connector.id, 'connector', 'actions');
      });
    });
  });

  const getSecretHeadersKeys = async (
    connectorId: string,
    user: User,
    expectedStatus: number = 200
  ) => {
    const { body: res } = await supertestWithoutAuth
      .get(`/internal/stack_connectors/${connectorId}/secret_headers`)
      .set('kbn-xsrf', 'true')
      .auth(user.username, user.password)
      .expect(expectedStatus);

    return res;
  };

  const createWebhookConnector = async (secretHeaders: Record<string, string>) => {
    const { body: createdAction } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'test')
      .send({
        name: 'A generic Webhook action',
        connector_type_id: '.webhook',
        secrets: {
          secretHeaders,
        },
        config: {
          url: 'https://some.non.existent.com',
          hasAuth: false,
        },
      })
      .expect(200);

    return createdAction;
  };

  const createCasesWebhookConnector = async (secretHeaders: Record<string, string>) => {
    const { body: createdAction } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'test')
      .send({
        name: 'A generic Cases Webhook action',
        connector_type_id: '.cases-webhook',
        secrets: {
          secretHeaders,
        },
        config: {
          createCommentJson: '{"body":{{{case.comment}}}}',
          createCommentMethod: 'post',
          createCommentUrl:
            'https://some.non.existent.com/rest/api/2/issue/{{{external.system.id}}}/comment',
          createIncidentJson:
            '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"labels":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
          createIncidentMethod: 'post',
          createIncidentResponseKey: 'id',
          createIncidentUrl: 'https://some.non.existent.com/rest/api/2/issue',
          getIncidentResponseExternalTitleKey: 'key',
          hasAuth: true,
          headers: { ['content-type']: 'application/json', ['kbn-xsrf']: 'abcd' },
          viewIncidentUrl: 'https://some.non.existent.com/browse/{{{external.system.title}}}',
          getIncidentUrl: 'https://some.non.existent.com/rest/api/2/issue/{{{external.system.id}}}',
          getIncidentMethod: 'get',
          getIncidentJson: null,
          updateIncidentJson:
            '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"labels":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
          updateIncidentMethod: 'put',
          updateIncidentUrl:
            'https://some.non.existent.com/rest/api/2/issue/{{{external.system.id}}}',
        },
      })
      .expect(200);

    return createdAction;
  };

  const createServerLogConnector = async () => {
    const { body: createdAction } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'A server.log action',
        connector_type_id: '.server-log',
      })
      .expect(200);

    return createdAction;
  };
}
