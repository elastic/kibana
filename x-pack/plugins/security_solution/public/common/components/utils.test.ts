/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { cloudExperimentsMock } from '@kbn/cloud-experiments-plugin/common/mocks';
import { useVariation } from './utils';

describe('useVariation', () => {
  test('it should call the setter if cloudExperiments is enabled', async () => {
    const cloudExperiments = cloudExperimentsMock.createStartMock();
    cloudExperiments.getVariation.mockResolvedValue('resolved value');
    const setter = jest.fn();
    renderHook(() =>
      useVariation(
        cloudExperiments,
        'security-solutions.add-integrations-url',
        'my default value',
        setter
      )
    );
    await new Promise((resolve) => process.nextTick(resolve));
    expect(setter).toHaveBeenCalledTimes(1);
    expect(setter).toHaveBeenCalledWith('resolved value');
  });

  test('it should not call the setter if cloudExperiments is not enabled', async () => {
    const setter = jest.fn();
    renderHook(() =>
      useVariation(undefined, 'security-solutions.add-integrations-url', 'my default value', setter)
    );
    await new Promise((resolve) => process.nextTick(resolve));
    expect(setter).not.toHaveBeenCalled();
  });
});
