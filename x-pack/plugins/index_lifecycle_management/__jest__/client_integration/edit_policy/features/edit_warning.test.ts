/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';
import { setupEnvironment } from '../../helpers';
import { initTestBed } from '../init_test_bed';
import { getDefaultHotPhasePolicy, POLICY_NAME } from '../constants';

describe('<EditPolicy /> edit warning', () => {
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

  test('no edit warning for a new policy', async () => {
    httpRequestsMockHelpers.setLoadPolicies([]);
    await act(async () => {
      testBed = await initTestBed();
    });
    const { exists, component } = testBed;
    component.update();
    expect(exists('editWarning')).toBe(false);
  });

  test('an edit warning is shown for an existing policy', async () => {
    httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy(POLICY_NAME)]);
    await act(async () => {
      testBed = await initTestBed();
    });
    const { exists, component } = testBed;
    component.update();
    expect(exists('editWarning')).toBe(true);
  });

  test('no indices link if no indices', async () => {
    httpRequestsMockHelpers.setLoadPolicies([
      { ...getDefaultHotPhasePolicy(POLICY_NAME), indices: [] },
    ]);
    await act(async () => {
      testBed = await initTestBed();
    });
    const { exists, component } = testBed;
    component.update();
    expect(exists('linkedIndicesLink')).toBe(false);
  });

  test('no index templates link if no index templates', async () => {
    httpRequestsMockHelpers.setLoadPolicies([
      { ...getDefaultHotPhasePolicy(POLICY_NAME), indexTemplates: [] },
    ]);
    await act(async () => {
      testBed = await initTestBed();
    });
    const { exists, component } = testBed;
    component.update();
    expect(exists('linkedIndexTemplatesLink')).toBe(false);
  });

  test('index templates link has number of indices', async () => {
    httpRequestsMockHelpers.setLoadPolicies([
      {
        ...getDefaultHotPhasePolicy(POLICY_NAME),
        indices: ['index1', 'index2', 'index3'],
      },
    ]);
    await act(async () => {
      testBed = await initTestBed();
    });
    const { component, find } = testBed;
    component.update();
    expect(find('linkedIndicesLink').text()).toBe('3 linked indices');
  });

  test('index templates link has number of index templates', async () => {
    httpRequestsMockHelpers.setLoadPolicies([
      {
        ...getDefaultHotPhasePolicy(POLICY_NAME),
        indexTemplates: ['template1', 'template2', 'template3'],
      },
    ]);
    await act(async () => {
      testBed = await initTestBed();
    });
    const { component, find } = testBed;
    component.update();
    expect(find('linkedIndexTemplatesLink').text()).toBe('3 linked index templates');
  });

  test('index templates link opens the flyout', async () => {
    httpRequestsMockHelpers.setLoadPolicies([
      {
        ...getDefaultHotPhasePolicy(POLICY_NAME),
        indexTemplates: ['template1'],
      },
    ]);
    await act(async () => {
      testBed = await initTestBed();
    });
    const { component, find, exists } = testBed;
    component.update();
    expect(exists('indexTemplatesFlyoutHeader')).toBe(false);
    find('linkedIndexTemplatesLink').simulate('click');
    expect(exists('indexTemplatesFlyoutHeader')).toBe(true);
  });
});
