/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import type { RawRule } from '@kbn/alerting-plugin/server/types';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover, checkAAD } from '../../../../common/lib';

/** Simulates 7.x documents where lastRun.outcomeMsg was stored as a string. */
const LEGACY_OUTCOME_MSG = 'legacy outcome message string';

export default function lastRunOutcomeMsgMigrationTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('lastRun outcomeMsg migration', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    async function getAlertFromEs(ruleId: string): Promise<RawRule> {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: `alert:${ruleId}`,
        },
        { meta: true }
      );
      expect(response.statusCode).to.eql(200);
      return response.body._source!.alert;
    }

    async function injectLegacyStringOutcomeMsg(ruleId: string) {
      await es.update({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: `alert:${ruleId}`,
        doc: {
          alert: {
            lastRun: {
              outcome: 'failed',
              outcomeMsg: LEGACY_OUTCOME_MSG,
            },
          },
        },
        refresh: 'wait_for',
      });
    }

    it('migrates legacy string outcomeMsg when bulk disabling rules', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: true,
            schedule: { interval: '1d' },
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await injectLegacyStringOutcomeMsg(createdRule.id);

      const beforeBulk = await getAlertFromEs(createdRule.id);
      expect((beforeBulk.lastRun as { outcomeMsg?: unknown } | undefined)?.outcomeMsg).to.eql(
        LEGACY_OUTCOME_MSG
      );

      await supertest
        .patch(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_disable`)
        .set('kbn-xsrf', 'foo')
        .send({
          ids: [createdRule.id],
        })
        .expect(200);

      const afterBulk = await getAlertFromEs(createdRule.id);
      expect(afterBulk.lastRun?.outcomeMsg).to.eql([LEGACY_OUTCOME_MSG]);
      expect(afterBulk.enabled).to.eql(false);

      const { body: ruleFromApi } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(ruleFromApi.last_run?.outcome_msg).to.eql([LEGACY_OUTCOME_MSG]);

      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: RULE_SAVED_OBJECT_TYPE,
        id: createdRule.id,
      });
    });

    it('migrates legacy string outcomeMsg when bulk enabling rules', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: false,
            schedule: { interval: '1d' },
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await injectLegacyStringOutcomeMsg(createdRule.id);

      const beforeBulk = await getAlertFromEs(createdRule.id);
      expect((beforeBulk.lastRun as { outcomeMsg?: unknown } | undefined)?.outcomeMsg).to.eql(
        LEGACY_OUTCOME_MSG
      );

      await supertest
        .patch(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_enable`)
        .set('kbn-xsrf', 'foo')
        .send({
          ids: [createdRule.id],
        })
        .expect(200);

      const afterBulk = await getAlertFromEs(createdRule.id);
      expect(afterBulk.lastRun?.outcomeMsg).to.eql([LEGACY_OUTCOME_MSG]);
      expect(afterBulk.enabled).to.eql(true);

      const { body: ruleFromApi } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(ruleFromApi.last_run?.outcome_msg).to.eql([LEGACY_OUTCOME_MSG]);

      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: RULE_SAVED_OBJECT_TYPE,
        id: createdRule.id,
      });
    });
  });
}
