/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file contains happy-path integration tests for the **public** backfill API routes
 * (`/api/alerting/rules/backfill/...`). These tests verify that the public endpoints are
 * reachable and produce the same results as the internal ones.
 *
 * The full suite of edge-case, authorization, and error-handling tests is maintained in the
 * corresponding internal API test files (schedule.ts, find.ts, get.ts, delete.ts), which
 * exercise the same shared handler logic via the `/internal/alerting/...` paths.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { asyncForEach } from '@kbn/std';
import { getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function publicBackfillApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('public backfill API', () => {
    const backfillIds: Array<{ id: string; spaceId: string }> = [];
    const objectRemover = new ObjectRemover(supertest);
    const spaceId = 'space1';

    afterEach(async () => {
      await asyncForEach(
        backfillIds,
        async ({ id, spaceId: sid }: { id: string; spaceId: string }) => {
          await supertest
            .delete(`${getUrlPrefix(sid)}/internal/alerting/rules/backfill/${id}`)
            .set('kbn-xsrf', 'foo');
        }
      );
      backfillIds.length = 0;
      await objectRemover.removeAll();
    });

    function getRule(overwrites = {}) {
      return getTestRuleData({
        rule_type_id: 'test.patternFiringAutoRecoverFalse',
        params: {
          pattern: {
            instance: [true, false, true],
          },
        },
        schedule: { interval: '12h' },
        ...overwrites,
      });
    }

    it('should schedule, find, get, and delete a backfill via the public API', async () => {
      const start = moment().utc().startOf('day').subtract(7, 'days').toISOString();
      const end = moment().utc().startOf('day').subtract(1, 'day').toISOString();

      // create a rule
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getRule())
        .expect(200);
      const ruleId = createdRule.id;
      objectRemover.add(spaceId, ruleId, 'rule', 'alerting');

      // --- Schedule via public API ---
      const scheduleResponse = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .send([{ rule_id: ruleId, ranges: [{ start, end }] }])
        .expect(200);

      const scheduleResult = scheduleResponse.body;
      expect(scheduleResult.length).to.eql(1);
      expect(typeof scheduleResult[0].id).to.be('string');

      const backfillId = scheduleResult[0].id;
      backfillIds.push({ id: backfillId, spaceId });

      expect(scheduleResult[0].duration).to.eql('12h');
      expect(scheduleResult[0].enabled).to.eql(true);
      expect(scheduleResult[0].start).to.eql(start);
      expect(scheduleResult[0].status).to.eql('pending');
      expect(scheduleResult[0].space_id).to.eql(spaceId);
      expect(scheduleResult[0].rule.id).to.eql(ruleId);

      // --- Get via public API ---
      const getResponse = await supertest
        .get(`${getUrlPrefix(spaceId)}/api/alerting/rules/backfill/${backfillId}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(getResponse.body.id).to.eql(backfillId);
      expect(getResponse.body.rule.id).to.eql(ruleId);
      expect(getResponse.body.status).to.eql('pending');

      // --- Find via public API ---
      const findResponse = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rules/backfill/_find?rule_ids=${ruleId}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(findResponse.body.total).to.be.greaterThan(0);
      const found = findResponse.body.data.find((b: any) => b.id === backfillId);
      expect(found).to.be.ok();
      expect(found.rule.id).to.eql(ruleId);

      // --- Delete via public API ---
      await supertest
        .delete(`${getUrlPrefix(spaceId)}/api/alerting/rules/backfill/${backfillId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      // Remove from cleanup list since we already deleted it
      const idx = backfillIds.findIndex((b) => b.id === backfillId);
      if (idx >= 0) backfillIds.splice(idx, 1);

      // Verify it's gone
      await supertest
        .get(`${getUrlPrefix(spaceId)}/api/alerting/rules/backfill/${backfillId}`)
        .set('kbn-xsrf', 'foo')
        .expect(404);
    });
  });
}
