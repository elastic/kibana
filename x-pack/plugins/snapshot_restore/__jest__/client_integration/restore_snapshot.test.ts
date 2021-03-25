/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';

import { pageHelpers, setupEnvironment } from './helpers';
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

      await act(async () => {
        testBed = await setup();
      });

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
      await act(async () => {
        testBed = await setup();
      });

      testBed.component.update();
    });

    it('hides the data streams warning when the snapshot has data streams', () => {
      const { exists } = testBed;
      expect(exists('dataStreamWarningCallOut')).toBe(false);
    });
  });

  describe('global state', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetSnapshotResponse(fixtures.getSnapshot());
      await act(async () => {
        testBed = await setup();
      });

      testBed.component.update();
    });

    it('shows an info callout when include_global_state is enabled', () => {
      const { exists, actions } = testBed;

      expect(exists('systemIndicesInfoCallOut')).toBe(false);

      actions.toggleGlobalState();

      expect(exists('systemIndicesInfoCallOut')).toBe(true);
    });
  });
});
