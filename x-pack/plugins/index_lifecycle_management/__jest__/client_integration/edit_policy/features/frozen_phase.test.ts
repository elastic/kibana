/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { licensingMock } from '../../../../../licensing/public/mocks';
import { setupEnvironment } from '../../helpers';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';

describe('<EditPolicy /> frozen phase', () => {
  let testBed: EditPolicyTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();
  });

  test('shows timing only when enabled', async () => {
    const { actions, exists } = testBed;

    expect(exists('frozen-phase')).toBe(true);
    expect(actions.frozen.hasMinAgeInput()).toBeFalsy();
    await actions.togglePhase('frozen');
    expect(actions.frozen.hasMinAgeInput()).toBeTruthy();
  });

  describe('on non-enterprise license', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();

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

    test('should not be available', async () => {
      const { exists } = testBed;
      expect(exists('frozen-phase')).toBe(false);
    });
  });
});
