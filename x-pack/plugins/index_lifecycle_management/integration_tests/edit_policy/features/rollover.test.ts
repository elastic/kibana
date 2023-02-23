/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { RolloverTestBed, setupRolloverTestBed } from './rollover.helpers';

describe('<EditPolicy /> rollover', () => {
  let testBed: RolloverTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupRolloverTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();
  });

  test('shows forcemerge when rollover enabled', async () => {
    const { actions } = testBed;
    expect(actions.hot.forceMergeExists()).toBeTruthy();
  });

  test('hides forcemerge when rollover is disabled', async () => {
    const { actions } = testBed;
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();
    expect(actions.hot.forceMergeExists()).toBeFalsy();
  });

  test('shows shrink input when rollover enabled', async () => {
    const { actions } = testBed;
    expect(actions.hot.shrinkExists()).toBeTruthy();
  });

  test('hides shrink input when rollover is disabled', async () => {
    const { actions } = testBed;
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();
    expect(actions.hot.shrinkExists()).toBeFalsy();
  });

  test('shows readonly input when rollover enabled', async () => {
    const { actions } = testBed;
    expect(actions.hot.readonlyExists()).toBeTruthy();
  });

  test('hides readonly input when rollover is disabled', async () => {
    const { actions } = testBed;
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();
    expect(actions.hot.readonlyExists()).toBeFalsy();
  });

  test('hides and disables searchable snapshot field', async () => {
    const { actions } = testBed;

    expect(actions.hot.searchableSnapshotsExists()).toBeTruthy();
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();
    await actions.togglePhase('cold');

    expect(actions.hot.searchableSnapshotsExists()).toBeFalsy();
  });

  test('shows rollover tip on minimum age', async () => {
    const { actions } = testBed;

    await actions.togglePhase('warm');
    await actions.togglePhase('cold');
    await actions.togglePhase('frozen');
    await actions.togglePhase('delete');

    expect(actions.warm.hasRolloverTipOnMinAge()).toBeTruthy();
    expect(actions.cold.hasRolloverTipOnMinAge()).toBeTruthy();
    expect(actions.frozen.hasRolloverTipOnMinAge()).toBeTruthy();
    expect(actions.delete.hasRolloverTipOnMinAge()).toBeTruthy();
  });

  test('hiding rollover tip on minimum age', async () => {
    const { actions } = testBed;
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();

    await actions.togglePhase('warm');
    await actions.togglePhase('cold');
    await actions.togglePhase('frozen');
    await actions.togglePhase('delete');

    expect(actions.warm.hasRolloverTipOnMinAge()).toBeFalsy();
    expect(actions.cold.hasRolloverTipOnMinAge()).toBeFalsy();
    expect(actions.frozen.hasRolloverTipOnMinAge()).toBeFalsy();
    expect(actions.delete.hasRolloverTipOnMinAge()).toBeFalsy();
  });
});
