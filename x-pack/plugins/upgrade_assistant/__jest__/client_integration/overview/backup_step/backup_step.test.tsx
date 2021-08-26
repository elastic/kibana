/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupEnvironment } from '../../helpers';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';

describe('Overview - Backup Step', () => {
  let testBed: OverviewTestBed;
  const { server } = setupEnvironment();

  beforeEach(async () => {
    testBed = await setupOverviewPage();
    testBed.component.update();
  });

  afterAll(() => {
    server.restore();
  });

  describe('On-prem', () => {
    test('Shows link to Snapshot and Restore', () => {
      const { exists, find } = testBed;
      expect(exists('snapshotRestoreLink')).toBe(true);
      expect(find('snapshotRestoreLink').props().href).toBe('snapshotAndRestoreUrl');
    });
  });
});
