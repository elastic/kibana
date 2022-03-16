/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../helpers';
import { AppTestBed, setupAppPage } from './app.helpers';

describe('Cluster upgrade', () => {
  let testBed: AppTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('when user is still preparing for upgrade', () => {
    beforeEach(async () => {
      testBed = await setupAppPage(httpSetup);
    });

    test('renders overview', () => {
      const { exists } = testBed;
      expect(exists('overview')).toBe(true);
      expect(exists('isUpgradingMessage')).toBe(false);
      expect(exists('isUpgradeCompleteMessage')).toBe(false);
    });
  });

  // The way we detect if we are currently upgrading or if the upgrade has been completed is if
  // we ever get back a 426 error in *any* API response that UA makes. For that reason we can
  // just mock one of the APIs that are being called from the overview page to return an error
  // in order to trigger these interstitial states. In this case we're going to mock the
  // `es deprecations` response.
  describe('when cluster is in the process of a rolling upgrade', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, {
        statusCode: 426,
        message: '',
        attributes: {
          allNodesUpgraded: false,
        },
      });

      await act(async () => {
        testBed = await setupAppPage(httpSetup);
      });
    });

    test('renders rolling upgrade message', async () => {
      const { component, exists } = testBed;
      component.update();
      expect(exists('overview')).toBe(false);
      expect(exists('isUpgradingMessage')).toBe(true);
      expect(exists('isUpgradeCompleteMessage')).toBe(false);
    });
  });

  describe('when cluster has been upgraded', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, {
        statusCode: 426,
        message: '',
        attributes: {
          allNodesUpgraded: true,
        },
      });

      await act(async () => {
        testBed = await setupAppPage(httpSetup);
      });
    });

    test('renders upgrade complete message', () => {
      const { component, exists } = testBed;
      component.update();
      expect(exists('overview')).toBe(false);
      expect(exists('isUpgradingMessage')).toBe(false);
      expect(exists('isUpgradeCompleteMessage')).toBe(true);
    });
  });
});
