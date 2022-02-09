/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { ExperimentalFeaturesService } from './experimental_features_service';
import { ExperimentalFeatures } from '../../common/experimental_features';

export const useExperimentalFeatures = () => {
  const [featuresCache, setFeaturesCache] = useState<ExperimentalFeatures>({
    rulesListDatagrid: false,
  });

  const currentFeatures = ExperimentalFeaturesService.get();
  const stringifiedFeatures = JSON.stringify(currentFeatures);
  if (stringifiedFeatures !== JSON.stringify(featuresCache)) {
    setFeaturesCache(currentFeatures);
    return currentFeatures;
  }
  return featuresCache;
};
