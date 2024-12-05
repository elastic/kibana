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
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    testBed = await setupOverviewPage(httpSetup);
    testBed.component.update();
  });

  describe('Error state', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(undefined, {
        statusCode: 400,
        message: 'error',
      });

      testBed = await setupOverviewPage(httpSetup);
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
        migration_status: 'NO_MIGRATION_NEEDED',
      });

      await actions.clickRetrySystemIndicesButton();

      expect(exists('noMigrationNeededSection')).toBe(true);
    });
  });

  test('No migration needed', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'NO_MIGRATION_NEEDED',
    });

    testBed = await setupOverviewPage(httpSetup);

    const { exists, component } = testBed;

    component.update();

    expect(exists('noMigrationNeededSection')).toBe(true);
    expect(exists('startSystemIndicesMigrationButton')).toBe(false);
    expect(exists('viewSystemIndicesStateButton')).toBe(false);
  });

  test('Migration in progress', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'IN_PROGRESS',
    });

    testBed = await setupOverviewPage(httpSetup);

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
        migration_status: 'MIGRATION_NEEDED',
      });

      testBed = await setupOverviewPage(httpSetup);

      const { exists, component, find } = testBed;

      component.update();

      // Start migration should be enabled
      expect(exists('startSystemIndicesMigrationButton')).toBe(true);
      expect(find('startSystemIndicesMigrationButton').props().disabled).toBe(false);
      // Same for view system indices status
      expect(exists('viewSystemIndicesStateButton')).toBe(true);
    });

    test('handles confirmModal submission', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'MIGRATION_NEEDED',
      });

      testBed = await setupOverviewPage(httpSetup);

      const { exists, component, find } = testBed;

      component.update();

      expect(exists('startSystemIndicesMigrationButton')).toBe(true);
      await act(async () => {
        find('startSystemIndicesMigrationButton').simulate('click');
      });
      component.update();

      expect(exists('migrationConfirmModal')).toBe(true);

      const modal = document.body.querySelector('[data-test-subj="migrationConfirmModal"]');
      const confirmButton: HTMLButtonElement | null = modal!.querySelector(
        '[data-test-subj="confirmModalConfirmButton"]'
      );

      await act(async () => {
        confirmButton!.click();
      });
      component.update();

      expect(exists('migrationConfirmModal')).toBe(false);
    });

    test('Handles errors when migrating', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'MIGRATION_NEEDED',
      });
      httpRequestsMockHelpers.setSystemIndicesMigrationResponse(undefined, {
        statusCode: 400,
        message: 'error',
      });

      testBed = await setupOverviewPage(httpSetup);

      const { exists, component, find } = testBed;

      await act(async () => {
        find('startSystemIndicesMigrationButton').simulate('click');
      });

      component.update();

      const modal = document.body.querySelector('[data-test-subj="migrationConfirmModal"]');
      const confirmButton: HTMLButtonElement | null = modal!.querySelector(
        '[data-test-subj="confirmModalConfirmButton"]'
      );

      await act(async () => {
        confirmButton!.click();
      });
      component.update();

      // Error is displayed
      expect(exists('startSystemIndicesMigrationCalloutError')).toBe(true);
      // CTA is enabled
      expect(exists('startSystemIndicesMigrationButton')).toBe(true);
      expect(find('startSystemIndicesMigrationButton').props().disabled).toBe(false);
    });

    test('Handles errors from migration', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'ERROR',
        features: [
          {
            feature_name: 'kibana',
            indices: [
              {
                index: '.kibana',
                migration_status: 'ERROR',
                failure_cause: {
                  error: {
                    type: 'mapper_parsing_exception',
                  },
                },
              },
            ],
          },
        ],
      });

      testBed = await setupOverviewPage(httpSetup);

      const { exists } = testBed;

      // Error is displayed
      expect(exists('migrationFailedCallout')).toBe(true);
      // CTA is enabled
      expect(exists('startSystemIndicesMigrationButton')).toBe(true);
    });
  });
});
