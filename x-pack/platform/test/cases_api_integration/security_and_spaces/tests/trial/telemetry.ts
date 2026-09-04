/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { stringify as yamlStringify } from 'yaml';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import { AttachmentType } from '@kbn/cases-plugin/common';
import {
  CASES_URL,
  CASE_TELEMETRY_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  OBSERVABLE_TYPE_IPV4,
} from '@kbn/cases-plugin/common/constants';
import type { CasesTelemetry } from '@kbn/cases-plugin/server/telemetry/types';
import { getPostCaseRequest, postCommentAlertReq } from '../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  getTelemetry,
  runTelemetryTask,
  createComment,
  bulkCreateAttachments,
  addObservable,
} from '../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { superUser } from '../../../common/lib/authentication/users';

// Helper function to extract cases telemetry data from the response
const getCasesTelemetry = (telemetryResponse: any): CasesTelemetry => {
  return telemetryResponse.stats.stack_stats.kibana.plugins.cases;
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');

  describe('Cases telemetry', () => {
    before(async () => {
      await deleteAllCaseItems(es);
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should count cases from all spaces', async () => {
      await createCase(supertest, getPostCaseRequest(), 200, {
        user: superUser,
        space: 'space1',
      });

      await createCase(supertest, getPostCaseRequest(), 200, {
        user: superUser,
        space: 'space2',
      });

      await runTelemetryTask(supertest);

      await retry.try(async () => {
        const res = await getTelemetry(supertest);
        const casesTelemetry = getCasesTelemetry(res);
        expect(casesTelemetry.cases.all.total).toBe(2);
      });
    });

    it('should return the correct total number of alerts attached to cases', async () => {
      const firstCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'securitySolution' })
      );
      const secondCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'securitySolution' })
      );

      const firstCaseAlerts = [...Array(3).keys()].map((num) => `test-case-1-${num}`);
      const secondCaseAlerts = [...Array(2).keys()].map((num) => `test-case-2-${num}`);

      await bulkCreateAttachments({
        supertest,
        caseId: firstCase.id,
        params: [
          {
            ...postCommentAlertReq,
            alertId: firstCaseAlerts,
            index: firstCaseAlerts,
            owner: 'securitySolution',
          },
        ],
        expectedHttpCode: 200,
      });

      await bulkCreateAttachments({
        supertest,
        caseId: firstCase.id,
        params: [
          {
            ...postCommentAlertReq,
            alertId: secondCaseAlerts,
            index: secondCaseAlerts,
            owner: 'securitySolution',
          },
        ],
        expectedHttpCode: 200,
      });

      await createComment({
        supertest,
        caseId: secondCase.id,
        params: {
          ...postCommentAlertReq,
          alertId: 'test-case-2-3',
          index: 'test-case-2-3',
          owner: 'securitySolution',
        },
      });

      await runTelemetryTask(supertest);

      await retry.try(async () => {
        const res = await getTelemetry(supertest);
        const casesTelemetry = getCasesTelemetry(res);
        expect(casesTelemetry.alerts.all.total).toBe(6);
      });
    });

    it('should return the correct telemetry for cases with observables', async () => {
      // Index synthetic alert docs with ECS source.ip fields.  The server-side
      // extraction path fetches these via mget so we can control exactly which
      // observables are produced without needing real detection-engine alerts.
      const alertIndex = 'synthetic-cases-telemetry-alerts';

      // First case: one alert whose source.ip produces 1 auto-extracted observable
      await es.index({
        index: alertIndex,
        id: 'alert-telemetry-1',
        refresh: 'true',
        document: { 'source.ip': '127.0.0.2' },
      });

      // Second case: 50 alerts each with a distinct source.ip so they produce
      // 50 distinct observables — hitting MAX_OBSERVABLES_PER_CASE exactly.
      const bulkOps: Array<Record<string, unknown>> = [];
      for (let i = 0; i < 50; i++) {
        bulkOps.push({ index: { _index: alertIndex, _id: `alert-telemetry-2-${i}` } });
        bulkOps.push({ 'source.ip': `10.0.0.${i}` });
      }
      await es.bulk({ operations: bulkOps, refresh: 'true' });

      const caseSettings = { syncAlerts: false, extractObservables: true };

      const firstCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'securitySolution', settings: caseSettings }),
        200,
        { user: superUser, space: 'space1' }
      );

      const secondCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'securitySolution', settings: caseSettings }),
        200,
        { user: superUser, space: 'space2' }
      );

      // 1 manual observable on the first case
      await addObservable({
        supertest,
        caseId: firstCase.id,
        params: {
          observable: {
            typeKey: OBSERVABLE_TYPE_IPV4.key,
            value: '127.0.0.1',
            description: 'Manually added observable',
          },
        },
        auth: { user: superUser, space: 'space1' },
      });

      // 1 auto-extracted observable: attach the first alert to the first case.
      // extractAndAddObservables fires on bulkCreate and pulls source.ip from the doc.
      await bulkCreateAttachments({
        supertest,
        caseId: firstCase.id,
        params: [
          {
            type: AttachmentType.alert,
            alertId: 'alert-telemetry-1',
            index: alertIndex,
            rule: { id: 'rule-1', name: 'Rule 1' },
            owner: 'securitySolution',
          },
        ],
        auth: { user: superUser, space: 'space1' },
        expectedHttpCode: 200,
      });

      // 50 auto-extracted observables: one attachment per alert on the second case.
      // This reaches MAX_OBSERVABLES_PER_CASE (50) making totalWithMaxObservables = 1.
      const secondCaseAttachments = Array.from({ length: 50 }, (_, i) => ({
        type: AttachmentType.alert as const,
        alertId: `alert-telemetry-2-${i}`,
        index: alertIndex,
        rule: { id: 'rule-2', name: 'Rule 2' },
        owner: 'securitySolution',
      }));
      await bulkCreateAttachments({
        supertest,
        caseId: secondCase.id,
        params: secondCaseAttachments,
        auth: { user: superUser, space: 'space2' },
        expectedHttpCode: 200,
      });

      await runTelemetryTask(supertest);

      await retry.try(async () => {
        const res = await getTelemetry(supertest);
        const casesTelemetry = getCasesTelemetry(res);
        const allCasesTelemetry = casesTelemetry.cases.all;
        const securityCasesTelemetry = casesTelemetry.cases.sec;

        for (const telemetry of [allCasesTelemetry, securityCasesTelemetry]) {
          // 1 manual (addObservable call)
          expect(telemetry.observables.manual.default).toBe(1);
          // 1 from first case + 50 from second case = 51 auto-extracted
          expect(telemetry.observables.auto.default).toBe(51);
          expect(telemetry.observables.total).toBe(52);
          // second case has exactly MAX_OBSERVABLES_PER_CASE observables
          expect(telemetry.totalWithMaxObservables).toBe(1);
        }
      });

      // Clean up synthetic index
      await es.indices.delete({ index: alertIndex, ignore_unavailable: true });
    });

    describe('templates', () => {
      const TEMPLATES_URL = `${CASES_URL}/templates`;
      const OWNER = 'securitySolutionFixture';

      // Every field is inline, never a `$ref`. Only then do the declared field count and the
      // resolved field definitions share a denominator, so the test may assert both.
      const TEXT = { control: 'INPUT_TEXT', type: 'keyword' };
      const TOGGLE = { control: 'TOGGLE', type: 'boolean' };
      const DATE = { control: 'DATE_PICKER', type: 'date' };
      const NUMBER = { control: 'INPUT_NUMBER', type: 'long' };

      type FieldKind = typeof TEXT;

      const field = (name: string, kind: FieldKind) => ({ name, label: name, ...kind });

      const buildBody = (
        name: string,
        fields: Array<ReturnType<typeof field>>,
        overrides: Record<string, unknown> = {}
      ) => ({
        name,
        owner: OWNER,
        definition: yamlStringify({ name: `${name} case title`, fields }),
        ...overrides,
      });

      const request = (method: 'post' | 'put' | 'delete', path: string) =>
        supertest[method](path).set('kbn-xsrf', 'true').set('x-elastic-internal-origin', 'foo');

      /**
       * Drops the stored snapshot, which `deleteAllCaseItems` leaves behind and the collector
       * serves verbatim. Without this the retry below can pass on the PREVIOUS run's snapshot
       * before the task overwrites it, so the assertions would hold even against a broken
       * query. Removing it first means the only payload that can satisfy them is a fresh one.
       */
      const deleteTelemetrySnapshot = async () => {
        await es.deleteByQuery({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          q: `type:${CASE_TELEMETRY_SAVED_OBJECT}`,
          wait_for_completion: true,
          refresh: true,
          conflicts: 'proceed',
        });
      };

      /**
       * Removes `isEnabled` from a template document. No API path can produce this shape,
       * because create and update both write `isEnabled: input.isEnabled ?? true` — hence the
       * direct write. The shape is real all the same: the attribute is optional in every model
       * version, nothing backfills it, and the read path treats only an explicit `false` as
       * disabled, so a deployment can hold such documents.
       *
       * This is the only place that can prove the `missing: true` clause on the inventory's
       * boolean terms aggregation buckets an absent flag as enabled. A mocked client cannot,
       * and the clause has no precedent in this repository.
       *
       * `templateId` is the template's stable identity across versions. The raw document nests
       * attributes directly under the saved-object type, with no `attributes` level, which is
       * what the saved-object layer rewrites its own `.attributes.` KQL paths into.
       */
      const stripIsEnabled = async (templateId: string) => {
        const { updated } = await es.updateByQuery({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              filter: [
                { term: { type: CASE_TEMPLATE_SAVED_OBJECT } },
                { term: { [`${CASE_TEMPLATE_SAVED_OBJECT}.templateId`]: templateId } },
              ],
            },
          },
          script: {
            source: `ctx._source['${CASE_TEMPLATE_SAVED_OBJECT}'].remove('isEnabled')`,
          },
          refresh: true,
          conflicts: 'proceed',
        });

        // A wrong field path would match nothing and update nothing, leaving the assertion
        // this exists to support passing for the wrong reason. Fail loudly instead.
        expect(updated).toBe(1);
      };

      const createTemplate = async (
        name: string,
        fields: Array<ReturnType<typeof field>>,
        overrides: Record<string, unknown> = {}
      ) => {
        const { body } = await request('post', TEMPLATES_URL)
          .send(buildBody(name, fields, overrides))
          .expect(200);

        return body;
      };

      const updateTemplate = async (
        templateId: string,
        name: string,
        fields: Array<ReturnType<typeof field>>
      ) => {
        const { body } = await request('put', `${TEMPLATES_URL}/${templateId}`)
          .send(buildBody(name, fields))
          .expect(200);

        return body;
      };

      // Every solution scope stays empty because the fixture owner is not one of the three
      // real owners. Asserted rather than skipped, so a regression that folded an unknown
      // owner into a solution scope would fail here.
      const zeroedScope = {
        total: 0,
        totalEnabled: 0,
        totalDisabled: 0,
        totalSoftDeleted: 0,
        totalMigratedFromV1: 0,
        versionPercentiles: { p50: 0, p90: 0, p99: 0 },
        fieldCount: { total: 0, max: 0, average: 0 },
        fieldDefinitions: { totalsByControl: {}, totalsByType: {} },
        cases: {
          withTemplate: { total: 0, daily: 0, weekly: 0, monthly: 0 },
          withoutTemplate: { total: 0, daily: 0, weekly: 0, monthly: 0 },
        },
      };

      it('should report the templates snapshot', async () => {
        /**
         * Edited twice, so three version documents exist. Each version declares a different
         * field set on purpose: if the `isLatest` scoping regressed, the superseded versions
         * would move the field numbers as well as the total, rather than the total alone.
         */
        const edited = await createTemplate('Edited Template', [field('a1', TEXT)]);
        await updateTemplate(edited.templateId, 'Edited Template', [
          field('a1', TEXT),
          field('a2', TOGGLE),
          field('a3', DATE),
          field('a4', NUMBER),
        ]);
        const latest = await updateTemplate(edited.templateId, 'Edited Template', [
          field('a1', TEXT),
          field('a2', TOGGLE),
        ]);

        // Guards the version-distribution expectation below against a change in how an edit
        // numbers versions.
        expect(latest.templateVersion).toBe(3);

        const simple = await createTemplate('Simple Template', [field('b1', TEXT)]);

        /**
         * Left with no `isEnabled` at all. It must still count as enabled, so the numbers below
         * are unchanged by this — which is the point: if the aggregation stopped bucketing an
         * absent flag as enabled, `totalEnabled` would drop to 1 and the two counts would no
         * longer sum to the total.
         */
        await stripIsEnabled(simple.templateId);

        await createTemplate(
          'Disabled Template',
          [field('d1', TEXT), field('d2', DATE), field('d3', NUMBER)],
          { isEnabled: false }
        );

        /**
         * Edited once before the delete, so it has two version documents and a soft delete
         * stamps both. It must be counted as ONE deleted template, and must leave the
         * inventory entirely — its text field must not reach the field totals.
         */
        const doomed = await createTemplate('Doomed Template', [field('c1', TEXT)]);
        await updateTemplate(doomed.templateId, 'Doomed Template', [
          field('c1', TEXT),
          field('c2', TOGGLE),
        ]);
        await request('delete', `${TEMPLATES_URL}/${doomed.templateId}`).expect(204);

        await createCase(
          supertest,
          getPostCaseRequest({ tags: [], template: { id: edited.templateId } })
        );
        await createCase(
          supertest,
          getPostCaseRequest({ tags: [], template: { id: edited.templateId } })
        );
        await createCase(supertest, getPostCaseRequest({ tags: [] }));

        await deleteTelemetrySnapshot();
        await runTelemetryTask(supertest);

        await retry.try(async () => {
          const res = await getTelemetry(supertest);
          const casesTelemetry = getCasesTelemetry(res);

          /**
           * Checked before the deep assertion below. Collection omits this key when the
           * templates area fails, and `CasesTelemetry` declares it required, so reading
           * through it would fail with an opaque `TypeError` instead of a readable diff.
           */
          expect(casesTelemetry.templates).toBeDefined();

          /**
           * Asserted on its own, ahead of the payload comparison, because it is the one figure
           * a mocked client cannot establish. One of the three live templates carries no
           * `isEnabled`, so the counts only sum to the total while the aggregation buckets an
           * absent flag as enabled. On a regression this reports `2 !== 3` rather than burying
           * the cause in a whole-payload diff.
           */
          const { total, totalEnabled, totalDisabled } = casesTelemetry.templates.all;
          expect(totalEnabled + totalDisabled).toBe(total);

          expect(casesTelemetry.templates).toEqual({
            featureEnabled: true,
            all: {
              // The edited template counts once despite its three versions, and the
              // soft-deleted one does not count at all.
              total: 3,
              totalEnabled: 2,
              totalDisabled: 1,
              // One template, not one per version document.
              totalSoftDeleted: 1,
              totalMigratedFromV1: 0,
              // Two templates are on version 1, and the edited template is on version 3.
              versionPercentiles: { p50: 1, p90: 3, p99: 3 },
              // 2 + 1 + 3 declared fields across the live templates only.
              fieldCount: { total: 6, max: 3, average: 2 },
              // Read from the indexed field definitions, not from a re-parse of the YAML.
              fieldDefinitions: {
                totalsByControl: { INPUT_TEXT: 3, TOGGLE: 1, DATE_PICKER: 1, INPUT_NUMBER: 1 },
                totalsByType: { keyword: 3, boolean: 1, date: 1, long: 1 },
              },
              cases: {
                withTemplate: { total: 2, daily: 2, weekly: 2, monthly: 2 },
                withoutTemplate: { total: 1, daily: 1, weekly: 1, monthly: 1 },
              },
            },
            sec: zeroedScope,
            obs: zeroedScope,
            main: zeroedScope,
          });
        });
      });
    });
  });
};
