/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';
import { setupEnvironment, advanceTime } from '../../helpers';
import { SYSTEM_INDICES_UPGRADE_POLL_INTERVAL_MS } from '../../../../common/constants';

describe('Overview - Upgrade system indices - Step status', () => {
  let testBed: OverviewTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  test(`It's complete when no upgrade is needed`, async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesUpgradeStatus({
      upgrade_status: 'NO_UPGRADE_NEEDED',
    });

    await act(async () => {
      testBed = await setupOverviewPage();
    });

    const { exists, component } = testBed;

    component.update();

    expect(exists(`upgradeSystemIndicesStep-complete`)).toBe(true);
  });

  test(`It's incomplete when there are deprecation logs since last checkpoint`, async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesUpgradeStatus({
      upgrade_status: 'UPGRADE_NEEDED',
    });

    await act(async () => {
      testBed = await setupOverviewPage();
    });

    const { exists, component } = testBed;

    component.update();

    expect(exists(`upgradeSystemIndicesStep-incomplete`)).toBe(true);
  });

  describe('Poll for new status', () => {
    beforeEach(async () => {
      jest.useFakeTimers();

      // First request should make the step be incomplete
      httpRequestsMockHelpers.setLoadSystemIndicesUpgradeStatus({
        upgrade_status: 'UPGRADE_NEEDED',
      });

      testBed = await setupOverviewPage();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('renders step as complete when a upgraded needed status is followed by a no upgrade needed', async () => {
      const { exists } = testBed;

      expect(exists(`upgradeSystemIndicesStep-incomplete`)).toBe(true);

      httpRequestsMockHelpers.setLoadSystemIndicesUpgradeStatus({
        upgrade_status: 'NO_UPGRADE_NEEDED',
      });

      // Resolve the polling timeout.
      await advanceTime(SYSTEM_INDICES_UPGRADE_POLL_INTERVAL_MS);
      testBed.component.update();

      expect(exists(`upgradeSystemIndicesStep-complete`)).toBe(true);
    });
  });
});
