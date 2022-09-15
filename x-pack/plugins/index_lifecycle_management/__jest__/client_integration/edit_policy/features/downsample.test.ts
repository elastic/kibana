/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { DownsampleTestBed, setupDownsampleTestBed } from './downsample.helpers';

describe('<EditPolicy /> downsample', () => {
  let testBed: DownsampleTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupDownsampleTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();
  });

  test('enabling downsample in warm should hide readonly in warm and cold', async () => {
    const { actions } = testBed;

    await actions.togglePhase('warm');
    await actions.togglePhase('cold');

    expect(actions.warm.downsample.exists()).toBeTruthy();
    expect(actions.warm.readonlyExists()).toBeTruthy();
    expect(actions.cold.downsample.exists()).toBeTruthy();
    expect(actions.cold.readonlyExists()).toBeTruthy();

    await actions.warm.downsample.toggle();

    expect(actions.warm.readonlyExists()).toBeFalsy();
    expect(actions.cold.readonlyExists()).toBeFalsy();
  });

  test('enabling downsample in hot should hide readonly in hot', async () => {
    const { actions } = testBed;
    await actions.rollover.toggleDefault();

    expect(actions.hot.downsample.exists()).toBeTruthy();
    expect(actions.hot.readonlyExists()).toBeTruthy();

    await actions.hot.downsample.toggle();
    expect(actions.hot.readonlyExists()).toBeFalsy();
  });
});
