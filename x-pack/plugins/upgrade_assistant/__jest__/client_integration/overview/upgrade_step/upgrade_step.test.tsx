/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupEnvironment } from '../../helpers';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';

const DEPLOYMENT_URL = 'https://cloud.elastic.co./deployments/bfdad4ef99a24212a06d387593686d63';

describe('Overview - Upgrade Step', () => {
  let testBed: OverviewTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let setDelayResponse: ReturnType<typeof setupEnvironment>['setDelayResponse'];
  const setupCloudOverviewPage = () => {
    return setupOverviewPage(httpSetup, {
      plugins: {
        cloud: {
          isCloudEnabled: true,
          deploymentUrl: DEPLOYMENT_URL,
        },
      },
    });
  };

  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
    setDelayResponse = mockEnvironment.setDelayResponse;
  });

  describe('On-prem', () => {
    test('Shows link to setup upgrade docs', async () => {
      testBed = await setupOverviewPage(httpSetup);
      const { exists } = testBed;

      expect(exists('upgradeSetupDocsLink')).toBe(true);
      expect(exists('upgradeSetupCloudLink')).toBe(false);
    });
  });

  describe('On Cloud', () => {
    test('When ready for upgrade, shows upgrade CTA and link to docs', async () => {
      httpRequestsMockHelpers.setGetUpgradeStatusResponse({
        readyForUpgrade: true,
        details: 'Ready for upgrade',
      });

      testBed = await setupCloudOverviewPage();
      const { exists, find, component } = testBed;
      component.update();

      expect(exists('upgradeSetupDocsLink')).toBe(true);
      expect(exists('upgradeSetupCloudLink')).toBe(true);

      expect(find('upgradeSetupCloudLink').props().disabled).toBe(false);
      expect(find('upgradeSetupCloudLink').props().href).toBe(
        `${DEPLOYMENT_URL}?show_upgrade=true`
      );
    });

    test('When not ready for upgrade, the CTA button is disabled', async () => {
      httpRequestsMockHelpers.setGetUpgradeStatusResponse({
        readyForUpgrade: false,
        details: 'Resolve critical deprecations first',
      });

      testBed = await setupCloudOverviewPage();
      const { exists, find, component } = testBed;
      component.update();

      expect(exists('upgradeSetupDocsLink')).toBe(true);
      expect(exists('upgradeSetupCloudLink')).toBe(true);

      expect(find('upgradeSetupCloudLink').props().disabled).toBe(true);
    });

    test('An error callout is displayed, if status check failed', async () => {
      httpRequestsMockHelpers.setGetUpgradeStatusResponse(undefined, {
        statusCode: 500,
        message: 'Status check failed',
      });

      testBed = await setupCloudOverviewPage();
      const { exists, component } = testBed;
      component.update();

      expect(exists('upgradeSetupDocsLink')).toBe(false);
      expect(exists('upgradeSetupCloudLink')).toBe(false);
      expect(exists('upgradeStatusErrorCallout')).toBe(true);
    });

    test('The CTA button displays loading indicator', async () => {
      setDelayResponse(true);
      testBed = await setupCloudOverviewPage();
      const { exists, find } = testBed;

      expect(exists('upgradeSetupDocsLink')).toBe(true);
      expect(exists('upgradeSetupCloudLink')).toBe(true);
      expect(find('upgradeSetupCloudLink').childAt(0).props().isLoading).toBe(true);
    });
  });
});
