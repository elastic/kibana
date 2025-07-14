/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { asyncForEach } from '../../../../../../api_integration/services/transform/api';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import { indexTestDocs, waitForEventLogDocs } from './test_utils';
import { SuperuserAtSpace1 } from '../../../../scenarios';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { TEST_ACTIONS_INDEX, getSecurityRule, testDocTimestamps } from './test_utils';

// eslint-disable-next-line import/no-default-export
export default function scheduleBackfillTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('ad hoc backfill with rule actions', () => {
    const spaceId = SuperuserAtSpace1.space.id;
    let backfillIds: string[] = [];
    const objectRemover = new ObjectRemover(supertest);
    let connectorId: string;

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      // Index documents
      await indexTestDocs(es, esTestIndexTool);

      // create a connector
      const cresponse = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send({
          name: 'An index connector',
          connector_type_id: '.index',
          config: {
            index: TEST_ACTIONS_INDEX,
            refresh: true,
          },
          secrets: {},
        })
        .expect(200);
      connectorId = cresponse.body.id;
      objectRemover.add(spaceId, connectorId, 'connector', 'actions');
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: TEST_ACTIONS_INDEX,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await asyncForEach(backfillIds, async (id: string) => {
        await supertest
          .delete(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/${id}`)
          .set('kbn-xsrf', 'foo');
      });
      backfillIds = [];
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
    });

    it('should run summary actions for backfill jobs when run_actions=true', async () => {
      // create a siem query rule with an action
      const rresponse = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send(
          getSecurityRule({
            actions: [
              {
                group: 'default',
                id: connectorId,
                params: { documents: [{ alertUuid: '{{alert.uuid}}' }] },
                frequency: { notify_when: 'onActiveAlert', throttle: null, summary: true },
              },
            ],
          })
        )
        .expect(200);

      const ruleId = rresponse.body.id;
      objectRemover.add(spaceId, ruleId, 'rule', 'alerting');

      const start = moment(testDocTimestamps[1]).utc().startOf('day').toISOString();
      const end = moment(testDocTimestamps[11]).utc().startOf('day').toISOString();

      // schedule backfill for this rule
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send([{ rule_id: ruleId, ranges: [{ start, end }], run_actions: true }])
        .expect(200);

      const scheduleResult = response.body;
      expect(scheduleResult.length).to.eql(1);
      expect(scheduleResult[0].schedule.length).to.eql(4);

      const backfillId = scheduleResult[0].id;

      // wait for backfills to run
      await waitForEventLogDocs(
        retry,
        getService,
        backfillId,
        spaceId,
        new Map([['execute-backfill', { equal: 4 }]]),
        true // collapse by execution uuid
      );

      await retry.try(async () => {
        // verify that the correct number of actions were executed
        const actions = await es.search({
          index: TEST_ACTIONS_INDEX,
          body: { query: { match_all: {} } },
        });

        // 3 backfill executions resulted in alerts so 3 notifications should have
        // been generated.
        expect(actions.hits.hits.length).to.eql(3);
      });
    });

    it('should run per-alert actions for backfill jobs when run_actions=true', async () => {
      // create a siem query rule with an action
      const rresponse = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send(
          getSecurityRule({
            actions: [
              {
                group: 'default',
                id: connectorId,
                params: { documents: [{ alertUuid: '{{alert.uuid}}' }] },
                frequency: { notify_when: 'onActiveAlert', throttle: null, summary: false },
              },
            ],
          })
        )
        .expect(200);

      const ruleId = rresponse.body.id;
      objectRemover.add(spaceId, ruleId, 'rule', 'alerting');

      const start = moment(testDocTimestamps[1]).utc().startOf('day').toISOString();
      const end = moment(testDocTimestamps[11]).utc().startOf('day').toISOString();

      // schedule backfill for this rule
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send([{ rule_id: ruleId, ranges: [{ start, end }], run_actions: true }])
        .expect(200);

      const scheduleResult = response.body;
      expect(scheduleResult.length).to.eql(1);
      expect(scheduleResult[0].schedule.length).to.eql(4);

      const backfillId = scheduleResult[0].id;

      // wait for backfills to run
      await waitForEventLogDocs(
        retry,
        getService,
        backfillId,
        spaceId,
        new Map([['execute-backfill', { equal: 4 }]]),
        true // collapse by execution uuid
      );

      await retry.try(async () => {
        // verify that the correct number of actions were executed
        const actions = await es.search({
          index: TEST_ACTIONS_INDEX,
          body: { query: { match_all: {} } },
        });

        // 3 backfill executions resulted in 9 alerts so 9 notifications should have
        // been generated.
        expect(actions.hits.hits.length).to.eql(9);
      });
    });

    it('should not run actions for backfill jobs when run_actions=false', async () => {
      // create a siem query rule with an action
      const rresponse = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send(
          getSecurityRule({
            actions: [
              {
                group: 'default',
                id: connectorId,
                params: { documents: [{ alertUuid: '{{alert.uuid}}' }] },
                frequency: { notify_when: 'onActiveAlert', throttle: null, summary: true },
              },
            ],
          })
        )
        .expect(200);

      const ruleId = rresponse.body.id;
      objectRemover.add(spaceId, ruleId, 'rule', 'alerting');

      const start = moment(testDocTimestamps[1]).utc().startOf('day').toISOString();
      const end = moment(testDocTimestamps[11]).utc().startOf('day').toISOString();

      // schedule backfill for this rule
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send([{ rule_id: ruleId, ranges: [{ start, end }], run_actions: false }])
        .expect(200);

      const scheduleResult = response.body;
      expect(scheduleResult.length).to.eql(1);
      expect(scheduleResult[0].schedule.length).to.eql(4);
      expect(scheduleResult[0].rule.actions).to.eql([]);

      const backfillId = scheduleResult[0].id;

      // wait for backfills to run
      await waitForEventLogDocs(
        retry,
        getService,
        backfillId,
        spaceId,
        new Map([['execute-backfill', { equal: 4 }]]),
        true // collapse by execution uuid
      );

      // since we want to check that no actions were executed and they might take a bit to run
      // add a small delay
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // verify that the correct number of actions were executed
      const actions = await es.search({
        index: TEST_ACTIONS_INDEX,
        body: { query: { match_all: {} } },
      });

      // no actions should be generated
      expect(actions.hits.hits.length).to.eql(0);
    });
  });
}
