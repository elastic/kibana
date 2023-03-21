/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { HttpFetchOptionsWithPath } from '@kbn/core/public';
import { setupEnvironment } from '../../helpers';
import { getDefaultHotPhasePolicy } from '../constants';
import { API_BASE_PATH } from '../../../common/constants';
import {
  SearchableSnapshotsTestBed,
  setupSearchableSnapshotsTestBed,
} from './searchable_snapshots.helpers';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';

describe('<EditPolicy /> searchable snapshots', () => {
  let testBed: SearchableSnapshotsTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupSearchableSnapshotsTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();
  });

  test('enabling searchable snapshot should hide force merge, readonly and shrink in subsequent phases', async () => {
    const { actions } = testBed;

    await actions.togglePhase('warm');
    await actions.togglePhase('cold');

    expect(actions.warm.forceMergeExists()).toBeTruthy();
    expect(actions.warm.shrinkExists()).toBeTruthy();
    expect(actions.warm.readonlyExists()).toBeTruthy();
    expect(actions.warm.downsample.exists()).toBeTruthy();
    expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
    expect(actions.cold.readonlyExists()).toBeTruthy();
    expect(actions.cold.downsample.exists()).toBeTruthy();

    await actions.hot.setSearchableSnapshot('my-repo');

    expect(actions.warm.forceMergeExists()).toBeFalsy();
    expect(actions.warm.shrinkExists()).toBeFalsy();
    expect(actions.warm.readonlyExists()).toBeFalsy();
    expect(actions.warm.downsample.exists()).toBeFalsy();
    // searchable snapshot in cold is still visible
    expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
    expect(actions.cold.readonlyExists()).toBeFalsy();
    expect(actions.cold.downsample.exists()).toBeFalsy();
  });

  test('disabling rollover toggle, but enabling default rollover', async () => {
    const { actions } = testBed;
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();
    await actions.rollover.toggleDefault();

    expect(actions.hot.forceMergeExists()).toBeTruthy();
    expect(actions.hot.shrinkExists()).toBeTruthy();
    expect(actions.hot.searchableSnapshotsExists()).toBeTruthy();
  });

  test('should set the repository from previously defined repository', async () => {
    const { actions } = testBed;

    const repository = 'myRepo';
    await actions.hot.setSearchableSnapshot(repository);
    await actions.togglePhase('cold');
    await actions.cold.setMinAgeValue('10');
    await actions.cold.toggleSearchableSnapshot();
    await actions.togglePhase('frozen');
    await actions.frozen.setMinAgeValue('15');

    await actions.savePolicy();

    const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
    const [requestUrl, requestBody] = lastReq;
    const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

    expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
    expect(parsedReqBody.phases.hot.actions.searchable_snapshot.snapshot_repository).toBe(
      repository
    );
    expect(parsedReqBody.phases.cold.actions.searchable_snapshot.snapshot_repository).toBe(
      repository
    );
    expect(parsedReqBody.phases.frozen.actions.searchable_snapshot.snapshot_repository).toBe(
      repository
    );
  });

  test('should update the repository in all searchable snapshot actions', async () => {
    const { actions } = testBed;

    await actions.hot.setSearchableSnapshot('myRepo');
    await actions.togglePhase('cold');
    await actions.cold.setMinAgeValue('10');
    await actions.cold.toggleSearchableSnapshot();
    await actions.togglePhase('frozen');
    await actions.frozen.setMinAgeValue('15');

    // We update the repository in one phase
    await actions.frozen.setSearchableSnapshot('changed');
    await actions.savePolicy();

    const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
    const [requestUrl, requestBody] = lastReq;
    const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

    expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
    // And all phases should be updated
    expect(parsedReqBody.phases.hot.actions.searchable_snapshot.snapshot_repository).toBe(
      'changed'
    );
    expect(parsedReqBody.phases.cold.actions.searchable_snapshot.snapshot_repository).toBe(
      'changed'
    );
    expect(parsedReqBody.phases.frozen.actions.searchable_snapshot.snapshot_repository).toBe(
      'changed'
    );
  });

  describe('on cloud', () => {
    describe('new policy', () => {
      beforeEach(async () => {
        // simulate creating a new policy
        httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('')]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });
        httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['found-snapshots'] });

        await act(async () => {
          testBed = await setupSearchableSnapshotsTestBed(httpSetup, {
            appServicesContext: { cloud: { ...cloudMock.createSetup(), isCloudEnabled: true } },
          });
        });

        const { component } = testBed;
        component.update();
      });

      test('defaults searchable snapshot to true on cloud', async () => {
        const { find, actions } = testBed;
        await actions.togglePhase('cold');
        expect(
          find('searchableSnapshotField-cold.searchableSnapshotToggle').props()['aria-checked']
        ).toBe(true);
      });
    });

    describe('existing policy', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy()]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });
        httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['found-snapshots'] });

        await act(async () => {
          testBed = await setupSearchableSnapshotsTestBed(httpSetup, {
            appServicesContext: { cloud: { ...cloudMock.createSetup(), isCloudEnabled: true } },
          });
        });

        const { component } = testBed;
        component.update();
      });

      test('correctly sets snapshot repository default to "found-snapshots"', async () => {
        const { actions } = testBed;
        await actions.togglePhase('cold');
        await actions.cold.setMinAgeValue('10');
        await actions.cold.toggleSearchableSnapshot();

        await actions.savePolicy();

        const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
        const [requestUrl, requestBody] = lastReq;
        const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

        expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
        expect(parsedReqBody.phases.cold.actions.searchable_snapshot.snapshot_repository).toEqual(
          'found-snapshots'
        );
      });
    });
  });

  describe('on non-enterprise license', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy()]);
      httpRequestsMockHelpers.setListNodes({
        isUsingDeprecatedDataRoleConfig: false,
        nodesByAttributes: { test: ['123'] },
        nodesByRoles: { data: ['123'] },
      });
      httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['my-repo'] });

      await act(async () => {
        testBed = await setupSearchableSnapshotsTestBed(httpSetup, {
          appServicesContext: {
            license: licensingMock.createLicense({ license: { type: 'basic' } }),
          },
        });
      });

      const { component } = testBed;
      component.update();
    });

    test('disable setting searchable snapshots', async () => {
      const { actions } = testBed;

      expect(actions.hot.searchableSnapshotsExists()).toBeFalsy();
      expect(actions.cold.searchableSnapshotsExists()).toBeFalsy();
      expect(actions.frozen.searchableSnapshotsExists()).toBeFalsy();

      await actions.togglePhase('cold');

      // Still hidden in hot
      expect(actions.hot.searchableSnapshotsExists()).toBeFalsy();

      expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
      expect(actions.cold.searchableSnapshotDisabledDueToLicense()).toBeTruthy();
    });
  });
});
