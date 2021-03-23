/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { State } from '../../common/store';
import { Immutable } from '../../../common/endpoint/types';
import { ExperimentalFeatures } from '../../../common/experimental_features';

const getExperimentalFeatures = (
  state: Immutable<ExperimentalFeatures> | undefined,
  feature: keyof ExperimentalFeatures
): boolean => (state ? state[feature] : false);

export const useIsExperimentalFeatureEnabled = (feature: keyof ExperimentalFeatures): boolean => {
  return useSelector((state: State) =>
    getExperimentalFeatures(state.app.enableExperimental, feature)
  );
};
