/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Agent as SuperTestAgent } from 'supertest';
import { fromKueryExpression } from '@kbn/es-query';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

async function createAlert(
  objectRemover: ObjectRemover,
  supertest: SuperTestAgent,
  overwrites = {}
) {
  const { body: createdAlert } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .send(getTestRuleData(overwrites))
    .expect(200);
  objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');
  return createdAlert;
}

export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('find public API', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    describe('handle find alert request', function () {
      this.tags('skipFIPS');

      it('should handle find alert request appropriately', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY action',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);

        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              actions: [
                {
                  group: 'default',
                  id: createdAction.id,
                  params: {},
                  frequency: {
                    summary: false,
                    notify_when: 'onThrottleInterval',
                    throttle: '1m',
                  },
                },
              ],
              notify_when: undefined,
              throttle: undefined,
            })
          )
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rules/_find?search=test.noop&search_fields=alertTypeId`
        );

        expect(response.status).to.eql(200);
        expect(response.body.page).to.equal(1);
        expect(response.body.per_page).to.be.greaterThan(0);
        expect(response.body.total).to.be.greaterThan(0);
        const match = response.body.data.find((obj: any) => obj.id === createdAlert.id);
        expect(match).to.eql({
          id: createdAlert.id,
          name: 'abc',
          tags: ['foo'],
          rule_type_id: 'test.noop',
          revision: 0,
          running: false,
          consumer: 'alertsFixture',
          schedule: { interval: '1m' },
          enabled: true,
          actions: [
            {
              group: 'default',
              id: createdAction.id,
              connector_type_id: 'test.noop',
              params: {},
              frequency: {
                summary: false,
                notify_when: 'onThrottleInterval',
                throttle: '1m',
              },
              uuid: match.actions[0].uuid,
            },
          ],
          params: {},
          created_by: null,
          api_key_owner: null,
          api_key_created_by_user: null,
          scheduled_task_id: match.scheduled_task_id,
          updated_by: null,
          throttle: null,
          notify_when: null,
          mute_all: false,
          muted_alert_ids: [],
          created_at: match.created_at,
          updated_at: match.updated_at,
          execution_status: match.execution_status,
          ...(match.next_run ? { next_run: match.next_run } : {}),
          ...(match.last_run ? { last_run: match.last_run } : {}),
        });
        expect(Date.parse(match.created_at)).to.be.greaterThan(0);
        expect(Date.parse(match.updated_at)).to.be.greaterThan(0);
      });
    });

    it(`shouldn't find alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      await supertest
        .get(
          `${getUrlPrefix(
            Spaces.other.id
          )}/api/alerting/rules/_find?search=test.noop&search_fields=alertTypeId`
        )
        .expect(200, {
          page: 1,
          per_page: 10,
          total: 0,
          data: [],
        });
    });

    describe('basic functionality', () => {
      beforeEach(async () => {
        await Promise.all([
          createAlert(objectRemover, supertest, { params: { strValue: 'my a' } }),
          createAlert(objectRemover, supertest, { params: { strValue: 'my b' } }),
          createAlert(objectRemover, supertest, { params: { strValue: 'my c' } }),
          createAlert(objectRemover, supertest, {
            params: {
              risk_score: 60,
              severity: 'high',
            },
          }),
          createAlert(objectRemover, supertest, {
            params: {
              risk_score: 40,
              severity: 'medium',
            },
          }),
          createAlert(objectRemover, supertest, {
            params: {
              risk_score: 20,
              severity: 'low',
            },
          }),
        ]);
      });

      it(`it should NOT allow filter on monitoring attributes`, async () => {
        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rules/_find?filter=alert.attributes.monitoring.run.calculated_metrics.success_ratio>50`
        );

        expect(response.status).to.eql(400);
        expect(response.body.message).to.eql(
          'Error find rules: Filter is not supported on this field alert.attributes.monitoring.run.calculated_metrics.success_ratio'
        );
      });

      it(`it should NOT allow ordering on monitoring attributes`, async () => {
        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rules/_find?sort_field=monitoring.run.calculated_metrics.success_ratio`
        );

        expect(response.status).to.eql(400);
        expect(response.body.message).to.eql(
          'Error find rules: Sort is not supported on this field monitoring.run.calculated_metrics.success_ratio'
        );
      });

      it(`it should NOT allow search_fields on monitoring attributes`, async () => {
        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rules/_find?search_fields=monitoring.run.calculated_metrics.success_ratio&search=50`
        );

        expect(response.status).to.eql(400);
        expect(response.body.message).to.eql(
          'Error find rules: Search field monitoring.run.calculated_metrics.success_ratio not supported'
        );
      });

      it('should filter on string parameters', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rules/_find?filter=alert.attributes.params.strValue:"my b"`
        );

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.strValue).to.eql('my b');
      });

      it('should filter on kueryNode parameters', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rules/_find?filter=${JSON.stringify(
            fromKueryExpression('alert.attributes.params.strValue:"my b"')
          )}`
        );

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.strValue).to.eql('my b');
      });

      it('should sort by parameters', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rules/_find?sort_field=params.severity&sort_order=asc`
        );
        expect(response.body.data[0].params.severity).to.equal('low');
        expect(response.body.data[1].params.severity).to.equal('medium');
        expect(response.body.data[2].params.severity).to.equal('high');
      });

      it('should search by parameters', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rules/_find?search_fields=params.severity&search=medium`
        );

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.severity).to.eql('medium');
      });

      it('should filter on parameters', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rules/_find?filter=alert.attributes.params.risk_score:40`
        );

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.risk_score).to.eql(40);

        expect(response.body.data[0].mapped_params).to.eql(undefined);
      });

      it('should error if filtering on mapped parameters directly using the public API', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rules/_find?filter=alert.attributes.mapped_params.risk_score:40`
        );

        expect(response.status).to.eql(400);
        expect(response.body.message).to.eql(
          'Error find rules: Filter is not supported on this field alert.attributes.mapped_params.risk_score'
        );
      });

      it('should throw when using rule_type_ids', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rules/_find?rule_type_ids=foo`
        );

        expect(response.statusCode).to.eql(400);
        expect(response.body).to.eql({
          statusCode: 400,
          error: 'Bad Request',
          message: '[request query.rule_type_ids]: definition for this key is missing',
        });
      });

      it('should throw when using consumers', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rules/_find?consumers=foo`
        );

        expect(response.statusCode).to.eql(400);
        expect(response.body).to.eql({
          statusCode: 400,
          error: 'Bad Request',
          message: '[request query.consumers]: definition for this key is missing',
        });
      });
    });

    describe('artifacts', () => {
      it('does not return artifacts when present', async () => {
        const expectedArtifacts = {
          artifacts: {
            investigation_guide: { blob: 'Sample investigation guide' },
            dashboards: [{ id: 'dashboard-1' }],
          },
        };
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData(expectedArtifacts))
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const { id } = createdAlert;

        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rules/_find`
        );

        expect(response.status).to.eql(200);

        const foundAlert = response.body.data.find((obj: any) => obj.id === id);
        expect(foundAlert).not.to.be(undefined);
        expect(foundAlert.artifacts).to.be(undefined);
      });
    });
  });
}
