/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExperimentalFeatures,
  allowedExperimentalValues,
  isValidExperimentalValue,
  getExperimentalAllowedValues,
} from '../../common/experimental_features';

const allowedExperimentalValueKeys = getExperimentalAllowedValues();

export const getIsExperimentalFeatureEnabled = (feature: keyof ExperimentalFeatures): boolean => {
  if (!isValidExperimentalValue(feature)) {
    throw new Error(
      `Invalid enable value ${feature}. Allowed values are: ${allowedExperimentalValueKeys.join(
        ', '
      )}`
    );
  }

  return allowedExperimentalValues[feature];
};
