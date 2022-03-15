/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { ExperimentalFeaturesService } from './experimental_features_service';
import { useExperimentalFeatures } from './use_experimental_features';

describe('useExperimentalFeatures', () => {
  it('useExperimentalFeatures returns the experiment flags', async () => {
    ExperimentalFeaturesService.init({
      experimentalFeatures: {
        rulesListDatagrid: true,
        rulesDetailLogs: true,
      },
    });

    const { result: firstResult } = renderHook(() => useExperimentalFeatures());

    expect(firstResult.current).toEqual({
      rulesListDatagrid: true,
      rulesDetailLogs: true,
    });

    ExperimentalFeaturesService.init({
      experimentalFeatures: {
        rulesListDatagrid: false,
        rulesDetailLogs: false,
      },
    });

    const { result: secondResult } = renderHook(() => useExperimentalFeatures());

    expect(secondResult.current).toEqual({
      rulesListDatagrid: false,
      rulesDetailLogs: false,
    });
  });
});
