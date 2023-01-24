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
import { REPOSITORY_NAME, SNAPSHOT_NAME } from './helpers/constant';
import { FEATURE_STATES_NONE_OPTION } from '../../common/constants';
import * as fixtures from '../../test/fixtures';

const {
  restoreSnapshot: { setup },
} = pageHelpers;

describe('<RestoreSnapshot />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: RestoreSnapshotTestBed;

  describe('wizard navigation', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetSnapshotResponse(
        REPOSITORY_NAME,
        SNAPSHOT_NAME,
        fixtures.getSnapshot()
      );

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

  describe('with data streams', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetSnapshotResponse(
        REPOSITORY_NAME,
        SNAPSHOT_NAME,
        fixtures.getSnapshot()
      );

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

  describe('without data streams', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetSnapshotResponse(
        REPOSITORY_NAME,
        SNAPSHOT_NAME,
        fixtures.getSnapshot({ totalDataStreams: 0 })
      );
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

  describe('feature states', () => {
    test('when no feature states hide dropdown and show no features callout', async () => {
      httpRequestsMockHelpers.setGetSnapshotResponse(
        REPOSITORY_NAME,
        SNAPSHOT_NAME,
        fixtures.getSnapshot({ featureStates: [] })
      );

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      testBed.component.update();

      const { exists, actions } = testBed;

      actions.toggleGlobalState();
      expect(exists('systemIndicesInfoCallOut')).toBe(false);
      expect(exists('featureStatesDropdown')).toBe(false);
      expect(exists('noFeatureStatesCallout')).toBe(true);
    });

    test('shows an extra info callout when includeFeatureState is enabled and we have featureStates present in snapshot', async () => {
      httpRequestsMockHelpers.setGetSnapshotResponse(
        REPOSITORY_NAME,
        SNAPSHOT_NAME,
        fixtures.getSnapshot({ featureStates: ['kibana'] })
      );

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();

      const { exists, actions } = testBed;

      expect(exists('systemIndicesInfoCallOut')).toBe(false);

      await actions.toggleFeatureState();

      expect(exists('systemIndicesInfoCallOut')).toBe(true);
    });
  });

  // NOTE: This suite can be expanded to simulate the user setting non-default values for all of
  // the form controls and asserting that the correct payload is sent to the API.
  describe('include aliases', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetSnapshotResponse(
        REPOSITORY_NAME,
        SNAPSHOT_NAME,
        fixtures.getSnapshot()
      );

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
        `${API_BASE_PATH}restore/${REPOSITORY_NAME}/${SNAPSHOT_NAME}`,
        expect.objectContaining({
          body: JSON.stringify({
            featureStates: [FEATURE_STATES_NONE_OPTION],
            includeAliases: false,
          }),
        })
      );
    });
  });
});
