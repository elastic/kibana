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
import { test } from '../../fixtures';
import type { ExtendedScoutTestFixtures } from '../../fixtures';

const SERVICE_NAME = 'unstable-java';
const START_DATE = 'now-15m';
const END_DATE = 'now';
const RULE_NAME = `Error count threshold ${faker.string.uuid()}`;
const APM_ALERTS_INDEX_PATTERN = '.alerts-observability.apm.alerts-*';
const RULE_TYPE_ID = 'apm.error_rate';
// Stateful uses rollover index with .internal prefix
const STATEFUL_ALERTS_INDEX = '.internal.alerts-observability.apm.alerts-default-000001';
// Serverless uses data stream without .internal prefix or numeric suffix
const SERVERLESS_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';

function createAlertDisplayTest(alertIndex: string) {
  return async ({
    pageObjects: { serviceDetailsPage },
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

    await test.step('index alert document', async () => {
      const now = new Date().toISOString();

      await esClient.index({
        index: alertIndex,
        refresh: 'wait_for',
        document: {
          '@timestamp': now,
          'kibana.alert.uuid': faker.string.uuid(),
          'kibana.alert.start': now,
          'kibana.alert.status': 'active',
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.rule.name': RULE_NAME,
          'kibana.alert.rule.uuid': ruleId,
          'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
          'kibana.alert.rule.category': RULE_NAME,
          'kibana.alert.rule.consumer': 'apm',
          'kibana.alert.reason': `Error count is 15 in the last 1 hr for service: ${SERVICE_NAME}, env: production. Alert when > 0.`,
          'kibana.alert.evaluation.threshold': 0,
          'kibana.alert.evaluation.value': 15,
          'kibana.alert.duration.us': 0,
          'kibana.alert.time_range': {
            gte: now,
          },
          'kibana.alert.instance.id': '*',
          'service.name': SERVICE_NAME,
          'service.environment': 'production',
          'processor.event': 'error',
          'kibana.space_ids': ['default'],
          'event.kind': 'signal',
          'event.action': 'open',
          tags: ['apm'],
        },
      });
    });

    await test.step('navigate to service alerts tab', async () => {
      await serviceDetailsPage.alertsTab.goToTab({
        serviceName: SERVICE_NAME,
        rangeFrom: START_DATE,
        rangeTo: END_DATE,
      });
    });

    await test.step('verify alert is visible', async () => {
      const ruleCell = serviceDetailsPage.alertsTab.alertsTable
        .getAllCellLocatorByColId('kibana.alert.rule.name')
        .filter({ hasText: RULE_NAME });
      await expect(ruleCell).toBeVisible();
    });
  };
}

test.describe('Alerts', () => {
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
      const ruleId = rule.id;

      // Delete alert documents
      try {
        await esClient.deleteByQuery({
          index: APM_ALERTS_INDEX_PATTERN,
          query: {
            term: { 'kibana.alert.rule.uuid': ruleId },
          },
          refresh: true,
          conflicts: 'proceed',
        });
      } catch {
        // Continue cleanup even if alert deletion fails
      }

      // Delete the rule
      try {
        await apiServices.alerting.rules.delete(ruleId);
      } catch {
        // Continue cleanup even if rule deletion fails
      }
    }
  });

  test(
    'Can create an error count rule from service inventory',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects: { serviceInventoryPage, alertsControls } }) => {
      await test.step('land on service inventory and opens alerts context menu', async () => {
        await serviceInventoryPage.gotoServiceInventory({
          rangeFrom: START_DATE,
          rangeTo: END_DATE,
        });
        await alertsControls.openContextMenu();
      });

      await test.step('select error count rule', async () => {
        await expect(alertsControls.errorCountItem).toBeVisible();
        await alertsControls.openErrorCountFlyout();
      });

      await test.step('fill rule definition step', async () => {
        await expect(
          alertsControls.addRuleFlyout.flyout.getByRole('heading', {
            name: 'Error count threshold',
          })
        ).toBeVisible();
        // Ensure the rule doesn't trigger alerts to avoid polluting the test environment with active alerts that could interfere with other tests
        await alertsControls.addRuleFlyout.fillIsAbove(1000000);
        await expect(alertsControls.addRuleFlyout.isAboveExpression).toHaveText(
          'is above 1000000 errors'
        );
      });

      await test.step('navigates to details step and set custom rule name', async () => {
        await alertsControls.addRuleFlyout.jumpToStep('details');
        await alertsControls.addRuleFlyout.fillName(RULE_NAME);
        await expect(alertsControls.addRuleFlyout.nameInput).toHaveValue(RULE_NAME);
      });

      await test.step('create the rule', async () => {
        await alertsControls.addRuleFlyout.saveRule({ saveEmptyActions: true });
        await expect(page.getByTestId('euiToastHeader')).toHaveText(`Created rule "${RULE_NAME}"`);
      });
    }
  );

  test(
    'Stateful - Displays an alert in the service details alerts tab',
    { tag: tags.stateful.classic },
    createAlertDisplayTest(STATEFUL_ALERTS_INDEX)
  );

  test(
    'Serverless - Displays an alert in the service details alerts tab',
    { tag: tags.serverless.observability.complete },
    createAlertDisplayTest(SERVERLESS_ALERTS_INDEX)
  );
});
