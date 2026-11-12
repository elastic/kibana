/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { OBSERVABLE_TYPE_AGENT_ID, OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import { buildUnifiedAlertReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  createConfiguration,
  deleteAllCaseItems,
  deleteConfiguration,
  bulkCreateAttachments,
  createComment,
  getCase,
  getConfigurationRequest,
} from '../../../../common/lib/api';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

/**
 * Integration tests for the server-side observable extraction side effect that
 * fires when alert/event attachments are created via bulkCreateAttachments with
 * case.settings.extractObservables === true (Platinum license required).
 *
 * Uses synthetic ES documents (plain index with ECS fields) as alert sources so
 * the tests do not require a running detection engine or real alert documents.
 * AlertService.getAlerts performs a plain mget by {_id, _index}, so any ES doc
 * in any index is a valid source.
 */
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('observable extraction on attachment bulkCreate', () => {
    const alertIndex = 'synthetic-cases-extract-observables-alerts';

    before(async () => {
      // Index synthetic alert documents with ECS fields for all tests in this suite.
      await es.index({
        index: alertIndex,
        id: 'ext-alert-1',
        refresh: 'true',
        document: { 'source.ip': '1.2.3.4', 'destination.ip': '10.0.0.1' },
      });
      await es.index({
        index: alertIndex,
        id: 'ext-alert-2',
        refresh: 'true',
        document: { 'source.ip': '5.6.7.8' },
      });
      await es.index({
        index: alertIndex,
        id: 'ext-alert-no-ecs',
        refresh: 'true',
        document: { message: 'no ECS fields here', severity: 'high' },
      });
      await es.index({
        index: alertIndex,
        id: 'ext-alert-fields',
        refresh: 'true',
        document: {
          'agent.id': 'integration-agent',
          'source.ip': '9.9.9.9',
          'destination.ip': '127.0.0.1',
          'user.employee_id': 'E123456',
        },
      });
      await es.index({
        index: alertIndex,
        id: 'ext-alert-bad-employee-id',
        refresh: 'true',
        document: { 'user.employee_id': 'not-an-id' },
      });
    });

    after(async () => {
      await es.indices.delete({ index: alertIndex, ignore_unavailable: true });
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await deleteConfiguration(es);
    });

    describe('with extractObservables: true', () => {
      it('auto-extracts source.ip and destination.ip from an alert attachment', async () => {
        const theCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
        );

        expect(theCase.observables).to.eql([]);

        await bulkCreateAttachments({
          supertest,
          caseId: theCase.id,
          params: [
            buildUnifiedAlertReq('securitySolutionFixture', {
              alertId: 'ext-alert-1',
              index: alertIndex,
              rule: { id: 'rule-1', name: 'Rule 1' },
            }),
          ],
          expectedHttpCode: 200,
        });

        const refreshedCase = await getCase({ supertest, caseId: theCase.id });

        expect(refreshedCase.observables.length).to.be(2);
        expect(
          refreshedCase.observables.some(
            (o) => o.typeKey === OBSERVABLE_TYPE_IPV4.key && o.value === '1.2.3.4'
          )
        ).to.be(true);
        expect(
          refreshedCase.observables.some(
            (o) => o.typeKey === OBSERVABLE_TYPE_IPV4.key && o.value === '10.0.0.1'
          )
        ).to.be(true);
      });

      it('returns the extracted observables in the bulkCreate response', async () => {
        const theCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
        );

        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: theCase.id,
          params: [
            buildUnifiedAlertReq('securitySolutionFixture', {
              alertId: 'ext-alert-1',
              index: alertIndex,
              rule: { id: 'rule-1', name: 'Rule 1' },
            }),
          ],
          expectedHttpCode: 200,
        });

        const refreshedCase = await getCase({ supertest, caseId: theCase.id });

        expect(updatedCase.observables.length).to.be(2);
        expect(updatedCase.total_observables).to.be(2);
        expect(updatedCase.version).to.be(refreshedCase.version);
      });

      it('returns the extracted observables in the legacy comments API response', async () => {
        const theCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
        );

        const updatedCase = await createComment({
          supertest,
          caseId: theCase.id,
          params: buildUnifiedAlertReq('securitySolutionFixture', {
            alertId: 'ext-alert-1',
            index: alertIndex,
            rule: { id: 'rule-1', name: 'Rule 1' },
          }),
        });

        const refreshedCase = await getCase({ supertest, caseId: theCase.id });

        expect(updatedCase.observables.length).to.be(2);
        expect(updatedCase.total_observables).to.be(2);
        expect(updatedCase.version).to.be(refreshedCase.version);
      });

      it('deduplicates observables when the same alert is attached more than once', async () => {
        const theCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
        );

        // First attachment: produces source.ip 5.6.7.8
        await bulkCreateAttachments({
          supertest,
          caseId: theCase.id,
          params: [
            buildUnifiedAlertReq('securitySolutionFixture', {
              alertId: 'ext-alert-2',
              index: alertIndex,
              rule: { id: 'rule-1', name: 'Rule 1' },
            }),
          ],
          expectedHttpCode: 200,
        });

        // Second attachment of the same alert: observable already exists, no new SO write
        await bulkCreateAttachments({
          supertest,
          caseId: theCase.id,
          params: [
            buildUnifiedAlertReq('securitySolutionFixture', {
              alertId: 'ext-alert-2',
              index: alertIndex,
              rule: { id: 'rule-1', name: 'Rule 1' },
            }),
          ],
          expectedHttpCode: 200,
        });

        const refreshedCase = await getCase({ supertest, caseId: theCase.id });

        // Should only have one observable despite two attachments of the same alert
        expect(refreshedCase.observables.length).to.be(1);
        expect(refreshedCase.observables[0].value).to.be('5.6.7.8');
      });

      it('skips extraction gracefully when the alert doc has no ECS observable fields', async () => {
        const theCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
        );

        // The attachment creation itself must succeed (extraction never throws)
        await bulkCreateAttachments({
          supertest,
          caseId: theCase.id,
          params: [
            buildUnifiedAlertReq('securitySolutionFixture', {
              alertId: 'ext-alert-no-ecs',
              index: alertIndex,
              rule: { id: 'rule-1', name: 'Rule 1' },
            }),
          ],
          expectedHttpCode: 200,
        });

        const refreshedCase = await getCase({ supertest, caseId: theCase.id });
        // No observables — alert doc had no ECS fields
        expect(refreshedCase.observables).to.eql([]);
      });

      it('merges observables from multiple alerts in the same bulkCreate call', async () => {
        const theCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
        );

        await bulkCreateAttachments({
          supertest,
          caseId: theCase.id,
          params: [
            buildUnifiedAlertReq('securitySolutionFixture', {
              alertId: 'ext-alert-1',
              index: alertIndex,
              rule: { id: 'rule-1', name: 'Rule 1' },
            }),
            buildUnifiedAlertReq('securitySolutionFixture', {
              alertId: 'ext-alert-2',
              index: alertIndex,
              rule: { id: 'rule-2', name: 'Rule 2' },
            }),
          ],
          expectedHttpCode: 200,
        });

        const refreshedCase = await getCase({ supertest, caseId: theCase.id });

        // ext-alert-1 contributes source.ip 1.2.3.4 + destination.ip 10.0.0.1,
        // ext-alert-2 contributes source.ip 5.6.7.8 → 3 distinct observables total
        expect(refreshedCase.observables.length).to.be(3);
      });
    });

    describe('with observable type fields in the configuration', () => {
      const observableTypes = [
        // Turn off the default agent.id field.
        { key: OBSERVABLE_TYPE_AGENT_ID.key, paths: [{ path: 'agent.id', enabled: false }] },
        // Skip one value on one default field of the IPv4 type.
        {
          key: OBSERVABLE_TYPE_IPV4.key,
          paths: [{ path: 'destination.ip', enabled: true, excludedValues: ['127.0.0.1'] }],
        },
        // A custom type with its own field and value pattern.
        {
          key: 'employee-id',
          label: 'Employee ID',
          valuePattern: '^E\\d{6}$',
          paths: [{ path: 'user.employee_id', enabled: true }],
        },
      ];

      const attachAlert = async (alertId: string) => {
        const theCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
        );

        await bulkCreateAttachments({
          supertest,
          caseId: theCase.id,
          params: [
            buildUnifiedAlertReq('securitySolutionFixture', {
              alertId,
              index: alertIndex,
              rule: { id: 'rule-1', name: 'Rule 1' },
            }),
          ],
          expectedHttpCode: 200,
        });

        return getCase({ supertest, caseId: theCase.id });
      };

      it('follows the toggles, the excluded values, and the value patterns', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({ overrides: { observableTypes } })
        );

        const refreshedCase = await attachAlert('ext-alert-fields');

        expect(
          refreshedCase.observables.map(({ typeKey, value }) => `${typeKey}:${value}`).sort()
        ).to.eql(['employee-id:E123456', `${OBSERVABLE_TYPE_IPV4.key}:9.9.9.9`]);
      });

      it('does not extract a value that does not match the pattern of a custom type', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({ overrides: { observableTypes } })
        );

        const refreshedCase = await attachAlert('ext-alert-bad-employee-id');

        expect(refreshedCase.observables).to.eql([]);
      });

      it('extracts the default fields when the configuration has no observable types', async () => {
        await createConfiguration(supertest, getConfigurationRequest());

        const refreshedCase = await attachAlert('ext-alert-fields');

        expect(
          refreshedCase.observables.map(({ typeKey, value }) => `${typeKey}:${value}`).sort()
        ).to.eql([
          `${OBSERVABLE_TYPE_AGENT_ID.key}:integration-agent`,
          `${OBSERVABLE_TYPE_IPV4.key}:127.0.0.1`,
          `${OBSERVABLE_TYPE_IPV4.key}:9.9.9.9`,
        ]);
      });
    });

    describe('with extractObservables: false', () => {
      it('does not extract observables when the setting is disabled', async () => {
        const theCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: false } })
        );

        await bulkCreateAttachments({
          supertest,
          caseId: theCase.id,
          params: [
            buildUnifiedAlertReq('securitySolutionFixture', {
              alertId: 'ext-alert-1',
              index: alertIndex,
              rule: { id: 'rule-1', name: 'Rule 1' },
            }),
          ],
          expectedHttpCode: 200,
        });

        const refreshedCase = await getCase({ supertest, caseId: theCase.id });
        expect(refreshedCase.observables).to.eql([]);
      });
    });
  });
};
