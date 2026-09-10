/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { Spaces } from '../../../scenarios';

export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('bulkEdit', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    describe('system actions', () => {
      const systemAction = {
        id: 'system-connector-test.system-action',
        uuid: '123',
        params: {},
      };

      it('should bulk edit system actions correctly', async () => {
        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        const payload = {
          ids: [rule.id],
          operations: [
            {
              operation: 'add',
              field: 'actions',
              value: [systemAction],
            },
          ],
        };

        const res = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send(payload)
          .expect(200);

        expect(res.body.rules[0].actions).to.eql([
          {
            id: 'system-connector-test.system-action',
            connector_type_id: 'test.system-action',
            params: {},
            uuid: '123',
          },
        ]);
      });

      it('should throw 400 if the system action is missing required properties', async () => {
        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        for (const propertyToOmit of ['id']) {
          const systemActionWithoutProperty = omit(systemAction, propertyToOmit);

          const payload = {
            ids: [rule.id],
            operations: [
              {
                operation: 'add',
                field: 'actions',
                value: [systemActionWithoutProperty],
              },
            ],
          };

          await supertest
            .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .send(payload)
            .expect(400);
        }
      });

      it('should throw 400 if the system action is missing required params', async () => {
        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        const payload = {
          ids: [rule.id],
          operations: [
            {
              operation: 'add',
              field: 'actions',
              value: [
                {
                  ...systemAction,
                  params: {},
                  id: 'system-connector-test.system-action-connector-adapter',
                },
              ],
            },
          ],
        };

        const res = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send(payload)
          .expect(200);

        expect(res.body.errors[0].message).to.eql(
          'Invalid system action params. System action type: test.system-action-connector-adapter - [myParam]: expected value of type [string] but got [undefined]'
        );
      });

      it('should throw 400 if the default action is missing the group', async () => {
        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        const payload = {
          ids: [rule.id],
          operations: [
            {
              operation: 'add',
              field: 'actions',
              value: [
                {
                  // group is missing
                  id: 'test-id',
                  params: {},
                },
              ],
            },
          ],
        };

        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send(payload);

        expect(response.status).to.eql(400);
        expect(response.body).to.eql({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Group is not defined in action test-id',
        });
      });

      it('should throw 400 when bulk editing a rule to use the same system action twice', async () => {
        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        const payload = {
          ids: [rule.id],
          operations: [
            {
              operation: 'add',
              field: 'actions',
              value: [systemAction, systemAction],
            },
          ],
        };

        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send(payload)
          .expect(200);

        expect(response.body.errors.length).to.eql(1);
        expect(response.body.errors[0].message).to.eql(
          'Cannot use action system-connector-test.system-action more than once for this rule'
        );
      });

      it('should allow bulk editing a rule with multiple instances of the same system action if allowMultipleSystemActions is true', async () => {
        const multipleSystemAction = {
          id: 'system-connector-test.system-action-allow-multiple',
          params: {},
        };

        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        const payload = {
          ids: [rule.id],
          operations: [
            {
              operation: 'add',
              field: 'actions',
              value: [multipleSystemAction, multipleSystemAction],
            },
          ],
        };

        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send(payload);

        expect(response.status).to.eql(200);
        expect(response.body.rules[0].actions.length).to.eql(2);

        const action1 = response.body.rules[0].actions[0];
        const action2 = response.body.rules[0].actions[1];

        expect(action1.id).to.eql('system-connector-test.system-action-allow-multiple');
        expect(action1.connector_type_id).to.eql('test.system-action-allow-multiple');
        expect(action1.uuid).to.not.be(undefined);

        expect(action2.id).to.eql('system-connector-test.system-action-allow-multiple');
        expect(action2.connector_type_id).to.eql('test.system-action-allow-multiple');
        expect(action2.uuid).to.not.be(undefined);

        // UUIDs should be different
        expect(action1.uuid).to.not.eql(action2.uuid);
      });
    });
  });
}
