/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountHook } from '@kbn/test-jest-helpers';

import { MlContext } from '../../../../../contexts/ml';
import { kibanaContextValueMock } from '../../../../../contexts/ml/__mocks__/kibana_context_value';

import { useCreateAnalyticsForm } from './use_create_analytics_form';

const getMountedHook = () =>
  mountHook(
    () => useCreateAnalyticsForm(),
    ({ children }) => (
      <MlContext.Provider value={kibanaContextValueMock}>{children}</MlContext.Provider>
    )
  );

describe('useCreateAnalyticsForm()', () => {
  test('initialization', () => {
    const { getLastHookValue } = getMountedHook();
    const { actions } = getLastHookValue();

    expect(typeof actions.createAnalyticsJob).toBe('function');
    expect(typeof actions.startAnalyticsJob).toBe('function');
    expect(typeof actions.setFormState).toBe('function');
  });

  // TODO
  // add tests for createAnalyticsJob() and startAnalyticsJob()
  // once React 16.9 with support for async act() is available.
});
