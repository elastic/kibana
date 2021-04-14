/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { licensingMock } from '../../../../../licensing/public/mocks';
import { setupEnvironment } from '../../helpers/setup_environment';
import { getDefaultHotPhasePolicy } from '../constants';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';

describe('<EditPolicy /> searchable snapshots', () => {
  let testBed: EditPolicyTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
    httpRequestsMockHelpers.setLoadSnapshotPolicies([]);
    httpRequestsMockHelpers.setListNodes({
      nodesByRoles: {},
      nodesByAttributes: { test: ['123'] },
      isUsingDeprecatedDataRoleConfig: false,
    });

    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();
  });

  test('enabling searchable snapshot should hide force merge, freeze, readonly and shrink in subsequent phases', async () => {
    const { actions } = testBed;

    await actions.warm.enable(true);
    await actions.cold.enable(true);

    expect(actions.warm.forceMergeFieldExists()).toBeTruthy();
    expect(actions.warm.shrinkExists()).toBeTruthy();
    expect(actions.warm.readonlyExists()).toBeTruthy();
    expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
    expect(actions.cold.freezeExists()).toBeTruthy();
    expect(actions.cold.readonlyExists()).toBeTruthy();

    await actions.hot.setSearchableSnapshot('my-repo');

    expect(actions.warm.forceMergeFieldExists()).toBeFalsy();
    expect(actions.warm.shrinkExists()).toBeFalsy();
    expect(actions.warm.readonlyExists()).toBeFalsy();
    // searchable snapshot in cold is still visible
    expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
    expect(actions.cold.freezeExists()).toBeFalsy();
    expect(actions.cold.readonlyExists()).toBeFalsy();
  });

  test('disabling rollover toggle, but enabling default rollover', async () => {
    const { actions } = testBed;
    await actions.hot.toggleDefaultRollover(false);
    await actions.hot.toggleRollover(false);
    await actions.hot.toggleDefaultRollover(true);

    expect(actions.hot.forceMergeFieldExists()).toBeTruthy();
    expect(actions.hot.shrinkExists()).toBeTruthy();
    expect(actions.hot.searchableSnapshotsExists()).toBeTruthy();
  });

  test('should set the repository from previously defined repository', async () => {
    const { actions } = testBed;

    const repository = 'myRepo';
    await actions.hot.setSearchableSnapshot(repository);
    await actions.cold.enable(true);
    await actions.cold.setMinAgeValue('10');
    await actions.cold.toggleSearchableSnapshot(true);
    await actions.frozen.enable(true);
    await actions.frozen.setMinAgeValue('15');

    await actions.savePolicy();
    const latestRequest = server.requests[server.requests.length - 1];
    expect(latestRequest.method).toBe('POST');
    expect(latestRequest.url).toBe('/api/index_lifecycle_management/policies');
    const reqBody = JSON.parse(JSON.parse(latestRequest.requestBody).body);

    expect(reqBody.phases.hot.actions.searchable_snapshot.snapshot_repository).toBe(repository);
    expect(reqBody.phases.cold.actions.searchable_snapshot.snapshot_repository).toBe(repository);
    expect(reqBody.phases.frozen.actions.searchable_snapshot.snapshot_repository).toBe(repository);
  });

  test('should update the repository in all searchable snapshot actions', async () => {
    const { actions } = testBed;

    await actions.hot.setSearchableSnapshot('myRepo');
    await actions.cold.enable(true);
    await actions.cold.setMinAgeValue('10');
    await actions.cold.toggleSearchableSnapshot(true);
    await actions.frozen.enable(true);
    await actions.frozen.setMinAgeValue('15');

    // We update the repository in one phase
    await actions.frozen.setSearchableSnapshot('changed');
    await actions.savePolicy();
    const latestRequest = server.requests[server.requests.length - 1];
    const reqBody = JSON.parse(JSON.parse(latestRequest.requestBody).body);

    // And all phases should be updated
    expect(reqBody.phases.hot.actions.searchable_snapshot.snapshot_repository).toBe('changed');
    expect(reqBody.phases.cold.actions.searchable_snapshot.snapshot_repository).toBe('changed');
    expect(reqBody.phases.frozen.actions.searchable_snapshot.snapshot_repository).toBe('changed');
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
          testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
        });

        const { component } = testBed;
        component.update();
      });

      test('defaults searchable snapshot to true on cloud', async () => {
        const { find, actions } = testBed;
        await actions.cold.enable(true);
        expect(
          find('searchableSnapshotField-cold.searchableSnapshotToggle').props()['aria-checked']
        ).toBe(true);
      });
    });

    describe('existing policy', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });
        httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['found-snapshots'] });

        await act(async () => {
          testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
        });

        const { component } = testBed;
        component.update();
      });

      test('correctly sets snapshot repository default to "found-snapshots"', async () => {
        const { actions } = testBed;
        await actions.cold.enable(true);
        await actions.cold.setMinAgeValue('10');
        await actions.cold.toggleSearchableSnapshot(true);
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        expect(latestRequest.method).toBe('POST');
        expect(latestRequest.url).toBe('/api/index_lifecycle_management/policies');
        const reqBody = JSON.parse(JSON.parse(latestRequest.requestBody).body);
        expect(reqBody.phases.cold.actions.searchable_snapshot.snapshot_repository).toEqual(
          'found-snapshots'
        );
      });
    });
  });

  describe('on non-enterprise license', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
      httpRequestsMockHelpers.setListNodes({
        isUsingDeprecatedDataRoleConfig: false,
        nodesByAttributes: { test: ['123'] },
        nodesByRoles: { data: ['123'] },
      });
      httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['my-repo'] });

      await act(async () => {
        testBed = await setup({
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

      await actions.cold.enable(true);

      // Still hidden in hot
      expect(actions.hot.searchableSnapshotsExists()).toBeFalsy();

      expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
      expect(actions.cold.searchableSnapshotDisabledDueToLicense()).toBeTruthy();
    });
  });
});
