/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { nextTick, pageHelpers, setupEnvironment } from './helpers';
import { RestoreSnapshotTestBed } from './helpers/restore_snapshot.helpers';
import * as fixtures from '../../test/fixtures';

const {
  restoreSnapshot: { setup },
} = pageHelpers;

describe('<RestoreSnapshot />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: RestoreSnapshotTestBed;

  afterAll(() => {
    server.restore();
  });
  describe('with data streams', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetSnapshotResponse(fixtures.getSnapshot());
      testBed = await setup();
      await nextTick();
      testBed.component.update();
    });

    it('shows the data streams warning when the snapshot has data streams', () => {
      const { exists } = testBed;
      expect(exists('dataStreamWarningCallOut')).toBe(true);
    });
  });

  describe('without data streams', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetSnapshotResponse(fixtures.getSnapshot({ totalDataStreams: 0 }));
      testBed = await setup();
      await nextTick();
      testBed.component.update();
    });

    it('hides the data streams warning when the snapshot has data streams', () => {
      const { exists } = testBed;
      expect(exists('dataStreamWarningCallOut')).toBe(false);
    });
  });
});
