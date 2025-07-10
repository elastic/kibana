/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import {
  activeO11yAlertsNewerThan90,
  activeO11yAlertsOlderThan90,
  activeSecurityAlertsNewerThan90,
  activeSecurityAlertsOlderThan90,
  activeStackAlertsNewerThan90,
  activeStackAlertsOlderThan90,
  getTestAlertDocs,
  inactiveO11yAlertsNewerThan90,
  inactiveO11yAlertsOlderThan90,
  inactiveSecurityAlertsNewerThan90,
  inactiveSecurityAlertsOlderThan90,
  inactiveStackAlertsNewerThan90,
  inactiveStackAlertsOlderThan90,
} from '../../../alerting_api_integration/security_and_spaces/group2/tests/alerting/alert_deletion/alert_deletion_test_utils';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);
  const retry = getService('retry');
  const es = getService('es');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);

  describe('clean up alerts', () => {
    const cleanupEventLog = async () => {
      await retry.try(async () => {
        const results = await es.deleteByQuery({
          index: '.kibana-event-log*',
          query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
          conflicts: 'proceed',
        });
        expect((results?.deleted ?? 0) > 0).to.eql(true);
      });
    };

    async function indexTestDocs() {
      const testAlertDocs = getTestAlertDocs('default');
      const operations = testAlertDocs.flatMap(({ _index, _id, _source: doc }) => {
        return [{ index: { _index, _id } }, doc];
      });
      await es.bulk({ refresh: 'wait_for', operations });
    }

    const testExpectedAlertsAreDeleted = async (
      expectedAlertsIds: string[],
      deletedAlertIds: string[]
    ) => {
      // wait for the task to complete
      await retry.try(async () => {
        const results = await es.search<IValidatedEvent>({
          index: '.kibana-event-log*',
          query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
        });
        expect(results.hits.hits.length).to.eql(1);
        expect(results.hits.hits[0]._source?.event?.outcome).to.eql('success');
        expect(results.hits.hits[0]._source?.kibana?.alert?.deletion?.num_deleted).to.eql(
          deletedAlertIds.length
        );
      });

      await retry.try(async () => {
        // query for alerts
        const alerts = await es.search({
          index: '.internal.alerts-*',
          size: 100,
          query: { match_all: {} },
        });
        expect(alerts.hits.hits.length).to.eql(expectedAlertsIds.length);
        expectedAlertsIds.forEach((alertId) => {
          expect(alerts.hits.hits.findIndex((a) => a._id === alertId)).to.be.greaterThan(-1);
        });
      });
    };

    before(async () => {
      // delete the created alerts
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    beforeEach(async () => {
      await indexTestDocs();
      await pageObjects.common.navigateToApp('triggersActions');
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await cleanupEventLog();
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('should delete all alerts when scheduling alert deletion task', async () => {
      await testSubjects.click('rulesSettingsLink');
      await testSubjects.click('alert-delete-open-modal-button');
      await testSubjects.click('alert-delete-active-checkbox');
      await testSubjects.click('alert-delete-inactive-checkbox');
      await retry.try(async () => {
        const element = await testSubjects.find('alert-delete-delete-confirmation');
        expect(await element.isEnabled()).to.be(true);
      });
      await testSubjects.click('alert-delete-delete-confirmation');
      await testSubjects.setValue('alert-delete-delete-confirmation', 'Delete');

      await testSubjects.click('alert-delete-submit');

      const expectedAlerts = [
        ...activeO11yAlertsNewerThan90,
        ...activeStackAlertsNewerThan90,
        ...activeSecurityAlertsNewerThan90,
        ...inactiveStackAlertsNewerThan90,
        ...inactiveO11yAlertsNewerThan90,
        ...inactiveSecurityAlertsNewerThan90,
      ];

      const deletedAlerts = [
        ...activeStackAlertsOlderThan90,
        ...activeO11yAlertsOlderThan90,
        ...activeSecurityAlertsOlderThan90,
        ...inactiveStackAlertsOlderThan90,
        ...inactiveO11yAlertsOlderThan90,
        ...inactiveSecurityAlertsOlderThan90,
      ];

      await testExpectedAlertsAreDeleted(
        expectedAlerts.map((a) => a.default.id),
        deletedAlerts.map((a) => a.default.id)
      );
    });
  });
};
