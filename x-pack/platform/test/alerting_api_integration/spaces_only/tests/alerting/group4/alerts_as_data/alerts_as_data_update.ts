/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_UUID,
  ALERT_SCHEDULED_ACTION_GROUP,
  ALERT_SCHEDULED_ACTION_DATE,
  ALERT_SCHEDULED_ACTION_THROTTLING,
} from '@kbn/rule-data-utils';
import { RuleNotifyWhen } from '@kbn/alerting-types';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { Spaces } from '../../../../scenarios';
import type { TaskManagerDoc } from '../../../../../common/lib';
import {
  getEventLog,
  getTestRuleData,
  getUrlPrefix,
  ObjectRemover,
} from '../../../../../common/lib';

export default function createAlertsAsDataInstallResourcesTest({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertestWithoutAuth);

  type PatternFiringAlert = Alert & {
    patternIndex: number;
    instancePattern: boolean[];
    [ALERT_SCHEDULED_ACTION_THROTTLING]?: object;
  };

  const alertsAsDataIndex = '.alerts-test.patternfiring.alerts-default';
  const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

  describe('alerts as data update persisted alerts', function () {
    this.tags('skipFIPS');
    before(async () => {
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });
    afterEach(async () => {
      await objectRemover.removeAll();
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    it('should write alerts with the state data', async () => {
      const { body: createdConnector } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiringAad',
            schedule: { interval: '1d' },
            throttle: null,
            notify_when: null,
            params: {
              pattern: {
                alertA: [true, true, true],
              },
            },
            actions: [
              {
                id: createdConnector.id,
                group: 'default',
                params: {},
                frequency: {
                  summary: false,
                  throttle: '2d',
                  notify_when: RuleNotifyWhen.THROTTLE,
                },
              },
            ],
          })
        );

      expect(response.status).to.eql(200);
      const ruleId = response.body.id;
      const actionUuid = response.body.actions[0].uuid;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      const events = await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 1 }]]));

      const executeEvent = events[0];
      const executionUuid = executeEvent?.kibana?.alert?.rule?.execution?.uuid;
      expect(executionUuid).not.to.be(undefined);

      // Get alert state from task document
      // we will remove this when we remove alerts from tasks state
      const state: any = await getTaskState(ruleId);

      const lastScheduledActionsUUID = state.alertInstances.alertA.meta.uuid;
      const lastScheduledActionsDate = state.alertInstances.alertA.meta.lastScheduledActions.date;
      const lastScheduledActionsGroup = state.alertInstances.alertA.meta.lastScheduledActions.group;
      const lastScheduledActionsActions =
        state.alertInstances.alertA.meta.lastScheduledActions.actions;

      expect(lastScheduledActionsDate).to.match(timestampPattern);
      expect(lastScheduledActionsGroup).to.equal('default');

      // As we don't use refresh:true on the update request it may take some time to get the alert doc.
      // Therefore we retry here to avoid test failures.
      await retry.try(async () => {
        // Query for alerts
        const alertDocs = await queryForAlertDocs<PatternFiringAlert>();
        expect(alertDocs.length).to.equal(1);
        const source: PatternFiringAlert = alertDocs[0]._source!;
        expect(source[ALERT_UUID]).to.equal(lastScheduledActionsUUID);
        expect(source[ALERT_SCHEDULED_ACTION_DATE]).to.match(timestampPattern);
        expect(source[ALERT_SCHEDULED_ACTION_GROUP]).to.equal('default');
        expect(source[ALERT_SCHEDULED_ACTION_THROTTLING]).to.eql({
          [actionUuid]: { date: source[ALERT_SCHEDULED_ACTION_DATE] },
        });

        // we will remove these when we remove alerts from task state
        expect(source[ALERT_SCHEDULED_ACTION_DATE]).to.equal(lastScheduledActionsDate);
        expect(source[ALERT_SCHEDULED_ACTION_GROUP]).to.equal(lastScheduledActionsGroup);
        expect(source[ALERT_SCHEDULED_ACTION_THROTTLING]).eql(lastScheduledActionsActions);
      });
    });
  });

  async function queryForAlertDocs<T>(): Promise<Array<SearchHit<T>>> {
    const searchResult = await es.search({
      index: alertsAsDataIndex,
      query: { match_all: {} },
    });
    return searchResult.hits.hits as Array<SearchHit<T>>;
  }

  async function getTaskState(ruleId: string) {
    const task = await es.get<TaskManagerDoc>({
      id: `task:${ruleId}`,
      index: '.kibana_task_manager',
    });

    return JSON.parse(task._source!.task.state);
  }

  async function waitForEventLogDocs(
    id: string,
    actions: Map<string, { gte: number } | { equal: number }>
  ) {
    return await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions,
      });
    });
  }
}
