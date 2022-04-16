/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { setupEnvironment } from '../../helpers';
import { initTestBed } from '../init_test_bed';

describe('<EditPolicy /> frozen phase', () => {
  let testBed: TestBed;
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
      testBed = await initTestBed();
    });

    const { component } = testBed;
    component.update();
  });

  describe('on non-enterprise license', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();

      await act(async () => {
        testBed = await initTestBed({
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
