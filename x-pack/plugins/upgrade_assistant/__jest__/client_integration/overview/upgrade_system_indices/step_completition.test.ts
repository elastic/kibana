/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';
import { setupEnvironment } from '../../helpers';

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
});
