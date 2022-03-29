/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../common';
import { pageHelpers, setupEnvironment } from './helpers';
import { RestoreSnapshotTestBed } from './helpers/restore_snapshot.helpers';
import * as fixtures from '../../test/fixtures';

const {
  restoreSnapshot: { setup },
} = pageHelpers;

describe('<RestoreSnapshot />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: RestoreSnapshotTestBed;

  describe('wizard navigation', () => {
    beforeEach(async () => {
      const snapshot = fixtures.getSnapshot();
      console.log(snapshot);
      httpRequestsMockHelpers.setGetSnapshotResponse(snapshot.repository, snapshot.snapshot, snapshot);

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    it('does not allow navigation when the step is invalid', async () => {
      const { actions } = testBed;
      actions.goToStep(2);
      expect(actions.canGoToADifferentStep()).toBe(true);
      actions.toggleModifyIndexSettings();
      expect(actions.canGoToADifferentStep()).toBe(false);
    });
  });

  describe.skip('with data streams', () => {
    beforeEach(async () => {
      const snapshot = fixtures.getSnapshot();
      httpRequestsMockHelpers.setGetSnapshotResponse(snapshot.repository, snapshot.snapshot, snapshot);

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('shows the data streams warning when the snapshot has data streams', () => {
      const { exists } = testBed;
      expect(exists('dataStreamWarningCallOut')).toBe(true);
    });
  });

  describe.skip('without data streams', () => {
    beforeEach(async () => {
      const snapshot = fixtures.getSnapshot({ totalDataStreams: 0 });
      httpRequestsMockHelpers.setGetSnapshotResponse(snapshot.repository, snapshot.snapshot, snapshot);
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('hides the data streams warning when the snapshot has data streams', () => {
      const { exists } = testBed;
      expect(exists('dataStreamWarningCallOut')).toBe(false);
    });
  });

  describe.skip('global state', () => {
    beforeEach(async () => {
      const snapshot = fixtures.getSnapshot();
      httpRequestsMockHelpers.setGetSnapshotResponse(snapshot.repository, snapshot.snapshot, snapshot);
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('shows an info callout when include_global_state is enabled', () => {
      const { exists, actions } = testBed;

      expect(exists('systemIndicesInfoCallOut')).toBe(false);

      actions.toggleGlobalState();

      expect(exists('systemIndicesInfoCallOut')).toBe(true);
    });
  });

  // NOTE: This suite can be expanded to simulate the user setting non-default values for all of
  // the form controls and asserting that the correct payload is sent to the API.
  describe.skip('include aliases', () => {
    const snapshot = fixtures.getSnapshot();

    beforeEach(async () => {
      httpRequestsMockHelpers.setRestoreSnapshotResponse(snapshot.repository, snapshot.snapshot, {});

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('is sent to the API', async () => {
      const { actions } = testBed;
      actions.toggleIncludeAliases();
      actions.goToStep(3);
      await actions.clickRestore();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}restore/${snapshot.repository}/${snapshot.snapshot}`,
        expect.objectContaining({ body: JSON.stringify({
          includeAliases: false
        })})
      );
    });
  });
});
