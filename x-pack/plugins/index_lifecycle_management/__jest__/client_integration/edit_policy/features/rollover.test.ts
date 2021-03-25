/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EditPolicyTestBed, setup } from '../edit_policy.helpers';
import { setupEnvironment } from '../../helpers/setup_environment';
import { getDefaultHotPhasePolicy } from '../constants';
import { act } from 'react-dom/test-utils';
import { licensingMock } from '../../../../../licensing/public/mocks';

describe('<EditPolicy /> rollover', () => {
  let testBed: EditPolicyTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
    httpRequestsMockHelpers.setLoadSnapshotPolicies([]);
    httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['abc'] });
    httpRequestsMockHelpers.setListNodes({
      nodesByRoles: {},
      nodesByAttributes: { test: ['123'] },
      isUsingDeprecatedDataRoleConfig: false,
    });

    await act(async () => {
      testBed = await setup({
        appServicesContext: {
          license: licensingMock.createLicense({ license: { type: 'enterprise' } }),
        },
      });
    });

    const { component } = testBed;
    component.update();
  });

  test('shows forcemerge when rollover enabled', async () => {
    const { actions } = testBed;
    expect(actions.hot.forceMergeFieldExists()).toBeTruthy();
  });

  test('hides forcemerge when rollover is disabled', async () => {
    const { actions } = testBed;
    await actions.hot.toggleDefaultRollover(false);
    await actions.hot.toggleRollover(false);
    expect(actions.hot.forceMergeFieldExists()).toBeFalsy();
  });

  test('shows shrink input when rollover enabled', async () => {
    const { actions } = testBed;
    expect(actions.hot.shrinkExists()).toBeTruthy();
  });

  test('hides shrink input when rollover is disabled', async () => {
    const { actions } = testBed;
    await actions.hot.toggleDefaultRollover(false);
    await actions.hot.toggleRollover(false);
    expect(actions.hot.shrinkExists()).toBeFalsy();
  });

  test('shows readonly input when rollover enabled', async () => {
    const { actions } = testBed;
    expect(actions.hot.readonlyExists()).toBeTruthy();
  });

  test('hides readonly input when rollover is disabled', async () => {
    const { actions } = testBed;
    await actions.hot.toggleDefaultRollover(false);
    await actions.hot.toggleRollover(false);
    expect(actions.hot.readonlyExists()).toBeFalsy();
  });

  test('hides and disables searchable snapshot field', async () => {
    const { actions } = testBed;
    await actions.hot.toggleDefaultRollover(false);
    await actions.hot.toggleRollover(false);
    await actions.cold.enable(true);

    expect(actions.hot.searchableSnapshotsExists()).toBeFalsy();
  });

  test('shows rollover tip on minimum age', async () => {
    const { actions } = testBed;

    await actions.warm.enable(true);
    await actions.cold.enable(true);
    await actions.frozen.enable(true);
    await actions.delete.enable(true);

    expect(actions.warm.hasRolloverTipOnMinAge()).toBeTruthy();
    expect(actions.cold.hasRolloverTipOnMinAge()).toBeTruthy();
    expect(actions.frozen.hasRolloverTipOnMinAge()).toBeTruthy();
    expect(actions.delete.hasRolloverTipOnMinAge()).toBeTruthy();
  });

  test('hiding rollover tip on minimum age', async () => {
    const { actions } = testBed;
    await actions.hot.toggleDefaultRollover(false);
    await actions.hot.toggleRollover(false);

    await actions.warm.enable(true);
    await actions.cold.enable(true);
    await actions.frozen.enable(true);
    await actions.delete.enable(true);

    expect(actions.warm.hasRolloverTipOnMinAge()).toBeFalsy();
    expect(actions.cold.hasRolloverTipOnMinAge()).toBeFalsy();
    expect(actions.frozen.hasRolloverTipOnMinAge()).toBeFalsy();
    expect(actions.delete.hasRolloverTipOnMinAge()).toBeFalsy();
  });
});
