/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TrainedModelsUrlState } from '../../../common/types/locator';
import { ML_PAGES } from '../../../common/constants/locator';

export function formatTrainedModelsManagementUrl(
  appBasePath: string,
  mlUrlGeneratorState: TrainedModelsUrlState['pageState']
): string {
  const url = `${appBasePath}/${ML_PAGES.TRAINED_MODELS_MANAGE}`;

  // if (mlUrlGeneratorState) {
  //   const { modelId } = mlUrlGeneratorState;
  // }

  return url;
}
