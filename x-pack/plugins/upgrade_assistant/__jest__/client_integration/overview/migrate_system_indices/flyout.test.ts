/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';
import { setupEnvironment } from '../../helpers';
import { systemIndicesMigrationStatus } from './mocks';

describe('Overview - Migrate system indices - Flyout', () => {
  let testBed: OverviewTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(systemIndicesMigrationStatus);

    await act(async () => {
      testBed = await setupOverviewPage();
    });

    testBed.component.update();
  });

  afterAll(() => {
    server.restore();
  });

  test('shows correct features in flyout table', async () => {
    const { actions, table } = testBed;

    await actions.clickViewSystemIndicesState();

    const { tableCellsValues } = table.getMetaData('flyoutDetails');

    expect(tableCellsValues.length).toBe(systemIndicesMigrationStatus.features.length);
    expect(tableCellsValues).toMatchSnapshot();
  });
});
