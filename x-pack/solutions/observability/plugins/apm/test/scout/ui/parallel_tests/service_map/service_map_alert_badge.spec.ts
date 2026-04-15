/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import type { ObltWorkerFixtures } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { faker } from '@faker-js/faker';
import { test, testData } from '../../fixtures';
import type { ExtendedScoutTestFixtures } from '../../fixtures';
import {
  EXTENDED_TIMEOUT,
  SERVICE_MAP_KUERY_OPBEANS,
  SERVICE_OPBEANS_JAVA,
} from '../../fixtures/constants';

const RULE_NAME = `Service map alert badge ${faker.string.uuid()}`;
const APM_ALERTS_INDEX_PATTERN = '.alerts-observability.apm.alerts-*';
const RULE_TYPE_ID = 'apm.error_rate';
const STATEFUL_ALERTS_INDEX = '.internal.alerts-observability.apm.alerts-default-000001';
const SERVERLESS_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';

/** Timestamp inside the service map Scout date window (see testData / synthtrace opbeans). */
const ALERT_TIMESTAMP = '2021-10-10T00:07:30.000Z';

function createServiceMapAlertBadgeTest(alertIndex: string) {
  return async ({
    pageObjects: { serviceMapPage },
    apiServices,
    esClient,
  }: ExtendedScoutTestFixtures & ObltWorkerFixtures) => {
    let ruleId: string;

    await test.step('create rule via API', async () => {
      const response = await apiServices.alerting.rules.create({
        ruleTypeId: RULE_TYPE_ID,
        name: RULE_NAME,
        consumer: 'apm',
        schedule: { interval: '1m' },
        enabled: false,
        params: {
          environment: 'production',
          threshold: 0,
          windowSize: 1,
          windowUnit: 'h',
        },
        tags: ['apm'],
      });
      ruleId = response.data.id;
    });

    await test.step('index active APM alert for opbeans-java', async () => {
      await esClient.index({
        index: alertIndex,
        refresh: 'wait_for',
        document: {
          '@timestamp': ALERT_TIMESTAMP,
          'kibana.alert.uuid': faker.string.uuid(),
          'kibana.alert.start': ALERT_TIMESTAMP,
          'kibana.alert.status': 'active',
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.rule.name': RULE_NAME,
          'kibana.alert.rule.uuid': ruleId,
          'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
          'kibana.alert.rule.category': RULE_NAME,
          'kibana.alert.rule.consumer': 'apm',
          'kibana.alert.reason': `Error count is 15 in the last 1 hr for service: ${SERVICE_OPBEANS_JAVA}, env: production. Alert when > 0.`,
          'kibana.alert.evaluation.threshold': 0,
          'kibana.alert.evaluation.value': 15,
          'kibana.alert.duration.us': 0,
          'kibana.alert.time_range': {
            gte: ALERT_TIMESTAMP,
            lte: ALERT_TIMESTAMP,
          },
          'kibana.alert.instance.id': '*',
          'service.name': SERVICE_OPBEANS_JAVA,
          'service.environment': 'production',
          'processor.event': 'error',
          'kibana.space_ids': ['default'],
          'event.kind': 'signal',
          'event.action': 'open',
          tags: ['apm'],
        },
      });
    });

    await test.step('open service map and see alert count badge on opbeans-java', async () => {
      await serviceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE, {
        kuery: SERVICE_MAP_KUERY_OPBEANS,
      });
      await serviceMapPage.waitForMapToLoad();
      await serviceMapPage.dismissPopoverIfOpen();
      await serviceMapPage.settleServiceMapLayout();
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      const badge = serviceMapPage.getServiceNodeAlertsBadge(SERVICE_OPBEANS_JAVA);
      await expect(badge).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await expect(badge).toHaveText('1');
    });
  };
}

test.describe('Service map - active alert badge on node', () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ apiServices, esClient }) => {
    const findResponse = await apiServices.alerting.rules.find({
      search: RULE_NAME,
      search_fields: ['name'],
      per_page: 1,
    });
    const rules = findResponse.data.data;

    for (const rule of rules) {
      const id = rule.id;
      try {
        await esClient.deleteByQuery({
          index: APM_ALERTS_INDEX_PATTERN,
          query: {
            term: { 'kibana.alert.rule.uuid': id },
          },
          refresh: true,
          conflicts: 'proceed',
        });
      } catch {
        // Continue cleanup even if alert deletion fails
      }
      try {
        await apiServices.alerting.rules.delete(id);
      } catch {
        // Continue cleanup even if rule deletion fails
      }
    }
  });

  test(
    'shows active alert count on service node (stateful)',
    { tag: tags.stateful.classic },
    createServiceMapAlertBadgeTest(STATEFUL_ALERTS_INDEX)
  );

  test(
    'shows active alert count on service node (serverless)',
    { tag: tags.serverless.observability.complete },
    createServiceMapAlertBadgeTest(SERVERLESS_ALERTS_INDEX)
  );
});
