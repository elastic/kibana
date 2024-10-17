/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics_app';
import { SyntheticsServices } from '../services/synthetics_services';

journey(`CustomStatusAlert`, async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });

  const services = new SyntheticsServices(params);
  const getService = params.getService;
  const retry: RetryService = getService('retry');

  const firstCheckTime = new Date(Date.now()).toISOString();

  let configId: string;

  before(async () => {
    await services.cleaUp();
  });

  after(async () => {
    await services.cleaUp();
  });

  step('Go to monitors page', async () => {
    await syntheticsApp.navigateToOverview(true, 15);
  });

  step('add test monitor', async () => {
    configId = await services.addTestMonitor(
      'Test Monitor',
      {
        type: 'http',
        urls: 'https://www.google.com',
        locations: ['us_central'],
      },
      configId
    );
    await services.addTestSummaryDocument({ timestamp: firstCheckTime, configId });
  });

  step('should create status rule', async () => {
    await page.getByTestId('syntheticsRefreshButtonButton').click();
    await page.waitForTimeout(5000);
    await page.getByTestId('syntheticsAlertsRulesButton').click();
    await page.getByTestId('manageStatusRuleName').click();
    await page.getByTestId('createNewStatusRule').click();

    await page.getByTestId('ruleNameInput').fill('Synthetics status rule');
    await page.getByTestId('saveRuleButton').click();
    await page.getByTestId('confirmModalConfirmButton').click();

    await page.waitForSelector(`text='Created rule "Synthetics status rule"'`);
  });

  step('verify rule creation', async () => {
    await retry.try(async () => {
      const rules = await services.getRules();
      expect(rules.length).toBe(3);
      expect(rules[2].params).toStrictEqual({
        condition: {
          downThreshold: 3,
          locationsThreshold: 1,
          groupBy: 'locationId',
          window: {
            numberOfChecks: 5,
          },
        },
      });
    });
  });
});
