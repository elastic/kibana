/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOUD_BACKUP_STATUS_POLL_INTERVAL_MS,
  CLOUD_SNAPSHOT_REPOSITORY,
} from '../../../../common/constants';
import { setupEnvironment, advanceTime } from '../../helpers';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';

describe('Overview - Backup Step', () => {
  let testBed: OverviewTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let setDelayResponse: ReturnType<typeof setupEnvironment>['setDelayResponse'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
    setDelayResponse = mockEnvironment.setDelayResponse;
  });

  describe('On-prem', () => {
    beforeEach(async () => {
      testBed = await setupOverviewPage(httpSetup);
    });

    test('Shows link to Snapshot and Restore', () => {
      const { exists, find } = testBed;
      expect(exists('snapshotRestoreLink')).toBe(true);
      expect(find('snapshotRestoreLink').props().href).toBe('snapshotAndRestoreUrl');
    });

    test('renders step as incomplete ', () => {
      const { exists } = testBed;
      expect(exists('backupStep-incomplete')).toBe(true);
    });
  });

  describe('On Cloud', () => {
    const setupCloudOverviewPage = async () =>
      setupOverviewPage(httpSetup, {
        plugins: {
          cloud: {
            isCloudEnabled: true,
            deploymentUrl: 'deploymentUrl',
          },
        },
      });

    describe('initial loading state', () => {
      beforeEach(async () => {
        // We don't want the request to load backup status to resolve immediately.
        setDelayResponse(true);
        testBed = await setupCloudOverviewPage();
      });

      test('is rendered', () => {
        const { exists } = testBed;
        expect(exists('cloudBackupLoading')).toBe(true);
      });
    });

    describe('error state', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadCloudBackupStatusResponse(undefined, {
          statusCode: 400,
          message: 'error',
        });

        testBed = await setupCloudOverviewPage();
      });

      test('is rendered', () => {
        const { exists } = testBed;
        testBed.component.update();
        expect(exists('cloudBackupErrorCallout')).toBe(true);
      });

      test('lets the user attempt to reload backup status', () => {
        const { exists } = testBed;
        testBed.component.update();
        expect(exists('cloudBackupRetryButton')).toBe(true);
      });

      test('loads on prem if missing found-snapshots repository', async () => {
        httpRequestsMockHelpers.setLoadCloudBackupStatusResponse(undefined, {
          statusCode: 404,
          message: `[${CLOUD_SNAPSHOT_REPOSITORY}] missing`,
        });

        testBed = await setupCloudOverviewPage();

        const { exists } = testBed;

        testBed.component.update();

        expect(exists('snapshotRestoreLink')).toBe(true);
        expect(exists('cloudBackupErrorCallout')).toBe(false);
      });
    });

    describe('success state', () => {
      describe('when data is backed up', () => {
        beforeEach(async () => {
          httpRequestsMockHelpers.setLoadCloudBackupStatusResponse({
            isBackedUp: true,
            lastBackupTime: '2021-08-25T19:59:59.863Z',
          });

          testBed = await setupCloudOverviewPage();
        });

        test('renders link to Cloud backups and last backup time ', () => {
          const { exists, find } = testBed;
          expect(exists('dataBackedUpStatus')).toBe(true);
          expect(exists('cloudSnapshotsLink')).toBe(true);
          expect(find('dataBackedUpStatus').text()).toContain('Last snapshot created on');
        });

        test('renders step as complete ', () => {
          const { exists } = testBed;
          expect(exists('backupStep-complete')).toBe(true);
        });
      });

      describe(`when data isn't backed up`, () => {
        beforeEach(async () => {
          httpRequestsMockHelpers.setLoadCloudBackupStatusResponse({
            isBackedUp: false,
            lastBackupTime: undefined,
          });

          testBed = await setupCloudOverviewPage();
        });

        test('renders link to Cloud backups and "not backed up" status', () => {
          const { exists } = testBed;
          expect(exists('dataNotBackedUpStatus')).toBe(true);
          expect(exists('cloudSnapshotsLink')).toBe(true);
        });

        test('renders step as incomplete ', () => {
          const { exists } = testBed;
          expect(exists('backupStep-incomplete')).toBe(true);
        });
      });
    });

    describe('poll for new status', () => {
      beforeEach(async () => {
        jest.useFakeTimers();

        // First request will succeed.
        httpRequestsMockHelpers.setLoadCloudBackupStatusResponse({
          isBackedUp: true,
          lastBackupTime: '2021-08-25T19:59:59.863Z',
        });

        testBed = await setupCloudOverviewPage();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      test('renders step as incomplete when a success state is followed by an error state', async () => {
        const { exists } = testBed;
        expect(exists('backupStep-complete')).toBe(true);

        // Second request will error.
        httpRequestsMockHelpers.setLoadCloudBackupStatusResponse(undefined, {
          statusCode: 400,
          message: 'error',
        });

        // Resolve the polling timeout.
        await advanceTime(CLOUD_BACKUP_STATUS_POLL_INTERVAL_MS);
        testBed.component.update();

        expect(exists('backupStep-incomplete')).toBe(true);
      });
    });
  });
});
