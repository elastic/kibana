/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { State } from '../store';
import {
  ExperimentalFeatures,
  getExperimentalAllowedValues,
} from '../../../common/experimental_features';

const allowedExperimentalValues = getExperimentalAllowedValues();

export const useIsExperimentalFeatureEnabled = (feature: keyof ExperimentalFeatures): boolean =>
  useSelector(({ app: { enableExperimental } }: State) => {
    if (!enableExperimental || !(feature in enableExperimental)) {
      throw new Error(
        `Invalid enable value ${feature}. Allowed values are: ${allowedExperimentalValues.join(
          ', '
        )}`
      );
    }
    return enableExperimental[feature];
  });
