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

  test('enabling searchable snapshot should hide force merge, freeze and shrink in subsequent phases', async () => {
    const { actions } = testBed;

    await actions.warm.enable(true);
    await actions.cold.enable(true);

    expect(actions.warm.forceMergeFieldExists()).toBeTruthy();
    expect(actions.warm.shrinkExists()).toBeTruthy();
    expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
    expect(actions.cold.freezeExists()).toBeTruthy();

    await actions.hot.setSearchableSnapshot('my-repo');

    expect(actions.warm.forceMergeFieldExists()).toBeFalsy();
    expect(actions.warm.shrinkExists()).toBeFalsy();
    // searchable snapshot in cold is still visible
    expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
    expect(actions.cold.freezeExists()).toBeFalsy();
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
        await actions.cold.toggleSearchableSnapshot(true);
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const request = JSON.parse(JSON.parse(latestRequest.requestBody).body);
        expect(request.phases.cold.actions.searchable_snapshot.snapshot_repository).toEqual(
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
