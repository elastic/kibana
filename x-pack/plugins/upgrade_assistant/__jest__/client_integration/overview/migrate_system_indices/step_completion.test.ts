/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';
import { setupEnvironment, advanceTime } from '../../helpers';
import { SYSTEM_INDICES_MIGRATION_POLL_INTERVAL_MS } from '../../../../common/constants';

describe('Overview - Migrate system indices - Step completion', () => {
  let testBed: OverviewTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  test(`It's complete when no upgrade is needed`, async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'NO_MIGRATION_NEEDED',
    });

    await act(async () => {
      testBed = await setupOverviewPage(httpSetup);
    });

    const { exists, component } = testBed;

    component.update();

    expect(exists(`migrateSystemIndicesStep-complete`)).toBe(true);
  });

  test(`It's incomplete when migration is needed`, async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'MIGRATION_NEEDED',
    });

    await act(async () => {
      testBed = await setupOverviewPage(httpSetup);
    });

    const { exists, component } = testBed;

    component.update();

    expect(exists(`migrateSystemIndicesStep-incomplete`)).toBe(true);
  });

  describe('Poll for new status', () => {
    beforeEach(async () => {
      jest.useFakeTimers();

      // First request should make the step be incomplete
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'IN_PROGRESS',
      });

      testBed = await setupOverviewPage(httpSetup);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('renders step as complete when a upgraded needed status is followed by a no upgrade needed', async () => {
      const { exists } = testBed;

      expect(exists('migrateSystemIndicesStep-incomplete')).toBe(true);

      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'NO_MIGRATION_NEEDED',
      });

      // Resolve the polling timeout.
      await advanceTime(SYSTEM_INDICES_MIGRATION_POLL_INTERVAL_MS);
      testBed.component.update();

      expect(exists('migrateSystemIndicesStep-complete')).toBe(true);
    });
  });
});
