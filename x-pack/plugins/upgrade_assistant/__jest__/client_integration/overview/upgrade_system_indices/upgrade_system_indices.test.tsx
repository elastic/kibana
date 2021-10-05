/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../../helpers';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';

describe('Overview - Upgrade system indices - Step', () => {
  let testBed: OverviewTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    testBed = await setupOverviewPage();
    testBed.component.update();
  });

  afterAll(() => {
    server.restore();
  });

  describe('Error state', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesUpgradeStatus(undefined, {
        statusCode: 400,
        message: 'error',
      });

      testBed = await setupOverviewPage();
    });

    test('Is rendered', () => {
      const { exists, component } = testBed;
      component.update();

      expect(exists('systemIndicesStatusErrorCallout')).toBe(true);
    });

    test(`Let's the user attempt to reload backup status`, () => {
      const { exists, component } = testBed;
      component.update();

      expect(exists('systemIndicesStatusRetryButton')).toBe(true);
    });
  });

  test('No upgrade needed', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesUpgradeStatus({
      upgrade_status: 'NO_UPGRADE_NEEDED',
    });

    testBed = await setupOverviewPage();

    const { exists, component } = testBed;

    component.update();

    expect(exists('noUpgradeNeededSection')).toBe(true);
    expect(exists('startSystemIndicesUpgradeButton')).toBe(false);
    expect(exists('viewSystemIndicesStateButton')).toBe(false);
  });

  test('Upgrade in progress', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesUpgradeStatus({
      upgrade_status: 'IN_PROGRESS',
    });

    testBed = await setupOverviewPage();

    const { exists, component, find } = testBed;

    component.update();

    // Start upgrade is disabled
    expect(exists('startSystemIndicesUpgradeButton')).toBe(true);
    expect(find('startSystemIndicesUpgradeButton').props().disabled).toBe(true);
    // But we keep view system indices CTA
    expect(exists('viewSystemIndicesStateButton')).toBe(true);
  });

  describe('Upgrade needed', () => {
    test('Initial state', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesUpgradeStatus({
        upgrade_status: 'UPGRADE_NEEDED',
      });

      testBed = await setupOverviewPage();

      const { exists, component, find } = testBed;

      component.update();

      // Start upgrade should be enabled
      expect(exists('startSystemIndicesUpgradeButton')).toBe(true);
      expect(find('startSystemIndicesUpgradeButton').props().disabled).toBe(false);
      // Same for view system indices status
      expect(exists('viewSystemIndicesStateButton')).toBe(true);
    });

    test('Handles errors when upgrading', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesUpgradeStatus({
        upgrade_status: 'UPGRADE_NEEDED',
      });
      httpRequestsMockHelpers.setUpgradeSystemIndicesResponse(undefined, {
        statusCode: 400,
        message: 'error',
      });

      testBed = await setupOverviewPage();

      const { exists, component, find } = testBed;

      await act(async () => {
        find('startSystemIndicesUpgradeButton').simulate('click');
      });

      component.update();

      // Error is displayed
      expect(exists('startSystemIndicesUpgradeCalloutError')).toBe(true);
      // CTA is enabled
      expect(exists('startSystemIndicesUpgradeButton')).toBe(true);
      expect(find('startSystemIndicesUpgradeButton').props().disabled).toBe(false);
    });
  });
});
