/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Service Dashboards',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('displays a linked dashboard with a control group', async ({
      page,
      pageObjects: { serviceDetailsPage },
      kbnClient,
    }) => {
      const testDashboardTitle = `Scout Test Dashboard for Service Dashboards ${Date.now()}`;
      // Create a test dashboard
      const dashboard = await kbnClient.savedObjects.create({
        type: 'dashboard',
        overwrite: false,
        attributes: {
          title: testDashboardTitle,
          description: 'Test dashboard for rule details Scout test',
          panelsJSON: '[]',
          controlGroupInput: {
            panelsJSON: JSON.stringify({
              'control-uuid': {
                type: 'optionsListControl',
                width: 'medium',
                grow: false,
                order: 0,
                explicitInput: {
                  fieldName: 'transaction.id',
                  useGlobalFilters: true,
                  ignoreValidations: false,
                  exclude: false,
                  existsSelected: false,
                  selectedOptions: [],
                  sort: { by: '_count', direction: 'desc' },
                  dataViewRefName: 'control-uuid:optionsListDataView',
                },
              },
            }),
          },
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
        },
      });
      const testDashboardId = dashboard.id;
      try {
        await test.step('Navigate to dashboard tab', async () => {
          await serviceDetailsPage.dashboardsTab.goToTab({
            serviceName: testData.SERVICE_OPBEANS_NODE,
            rangeFrom: testData.START_DATE,
            rangeTo: testData.END_DATE,
          });
        });

        await test.step('Link the test dashboard', async () => {
          await serviceDetailsPage.dashboardsTab.linkDashboardByTitle(testDashboardTitle);
        });

        await test.step('Verify the control group has rendered', async () => {
          await expect(page.getByTestId('controls-group-wrapper')).toBeVisible();
        });
      } finally {
        // Clean up: delete the test dashboard
        await kbnClient.savedObjects.delete({
          type: 'dashboard',
          id: testDashboardId,
        });
      }
    });
  }
);
