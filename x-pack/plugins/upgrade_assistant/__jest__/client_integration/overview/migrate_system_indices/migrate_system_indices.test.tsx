/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../../helpers';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';

describe('Overview - Migrate system indices', () => {
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
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(undefined, {
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

    test('Lets the user attempt to reload migration status', async () => {
      const { exists, component, actions } = testBed;
      component.update();

      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        upgrade_status: 'NO_UPGRADE_NEEDED',
      });

      await actions.clickRetrySystemIndicesButton();

      expect(exists('noMigrationNeededSection')).toBe(true);
    });
  });

  test('No migration needed', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      upgrade_status: 'NO_UPGRADE_NEEDED',
    });

    testBed = await setupOverviewPage();

    const { exists, component } = testBed;

    component.update();

    expect(exists('noMigrationNeededSection')).toBe(true);
    expect(exists('startSystemIndicesMigrationButton')).toBe(false);
    expect(exists('viewSystemIndicesStateButton')).toBe(false);
  });

  test('Migration in progress', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      upgrade_status: 'IN_PROGRESS',
    });

    testBed = await setupOverviewPage();

    const { exists, component, find } = testBed;

    component.update();

    // Start migration is disabled
    expect(exists('startSystemIndicesMigrationButton')).toBe(true);
    expect(find('startSystemIndicesMigrationButton').props().disabled).toBe(true);
    // But we keep view system indices CTA
    expect(exists('viewSystemIndicesStateButton')).toBe(true);
  });

  describe('Migration needed', () => {
    test('Initial state', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        upgrade_status: 'UPGRADE_NEEDED',
      });

      testBed = await setupOverviewPage();

      const { exists, component, find } = testBed;

      component.update();

      // Start migration should be enabled
      expect(exists('startSystemIndicesMigrationButton')).toBe(true);
      expect(find('startSystemIndicesMigrationButton').props().disabled).toBe(false);
      // Same for view system indices status
      expect(exists('viewSystemIndicesStateButton')).toBe(true);
    });

    test('Handles errors when migrating', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        upgrade_status: 'UPGRADE_NEEDED',
      });
      httpRequestsMockHelpers.setSystemIndicesMigrationResponse(undefined, {
        statusCode: 400,
        message: 'error',
      });

      testBed = await setupOverviewPage();

      const { exists, component, find } = testBed;

      await act(async () => {
        find('startSystemIndicesMigrationButton').simulate('click');
      });

      component.update();

      // Error is displayed
      expect(exists('startSystemIndicesMigrationCalloutError')).toBe(true);
      // CTA is enabled
      expect(exists('startSystemIndicesMigrationButton')).toBe(true);
      expect(find('startSystemIndicesMigrationButton').props().disabled).toBe(false);
    });
  });
});
