/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe.serial(
  'Service Dashboards',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const testDashboardTitle = `Scout Test - Dashboard for Service Dashboards`;
    let testDashboardId: string;

    test.beforeAll(async ({ kbnClient }) => {
      const dashboard = await kbnClient.savedObjects.create({
        type: 'dashboard',
        overwrite: false,
        attributes: {
          title: testDashboardTitle,
          description: 'Test dashboard for service dashboards Scout test',
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
        references: [
          {
            type: 'indexpattern',
            name: 'control-uuid:optionsListDataView',
            id: 'apm_static_data_view_id_default',
          },
        ],
      });
      testDashboardId = dashboard.id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.delete({
        type: 'dashboard',
        id: testDashboardId,
      });
    });

    test('displays a linked dashboard with a control group', async ({
      page,
      pageObjects: { serviceDetailsPage },
    }) => {
      await test.step('Navigate to dashboard tab', async () => {
        await serviceDetailsPage.dashboardsTab.goToTab({
          serviceName: testData.SERVICE_OPBEANS_NODE,
          rangeFrom: testData.START_DATE,
          rangeTo: testData.END_DATE,
        });
        await serviceDetailsPage.dashboardsTab.addServiceDashboardButton.waitFor({
          state: 'visible',
        });
      });

      await test.step('Link the test dashboard', async () => {
        await serviceDetailsPage.dashboardsTab.linkDashboardByTitle(testDashboardTitle);
      });

      await test.step('Verify the control group has rendered', async () => {
        await expect(page.getByTestId('controls-group-wrapper')).toBeVisible();
      });
    });

    test('unlinks a dashboard and shows the empty state', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      await test.step('Navigate to dashboard tab', async () => {
        await serviceDetailsPage.dashboardsTab.goToTab({
          serviceName: testData.SERVICE_OPBEANS_NODE,
          rangeFrom: testData.START_DATE,
          rangeTo: testData.END_DATE,
        });
      });

      await test.step('Unlink the dashboard', async () => {
        await serviceDetailsPage.dashboardsTab.unlinkDashboard();
      });

      await test.step('Verify the empty state is shown', async () => {
        await expect(serviceDetailsPage.dashboardsTab.addServiceDashboardButton).toBeVisible();
      });
    });
  }
);
