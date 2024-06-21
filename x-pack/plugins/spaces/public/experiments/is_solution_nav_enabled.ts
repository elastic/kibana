/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, of, shareReplay } from 'rxjs';

export const SOLUTION_NAV_FEATURE_FLAG_NAME = 'solutionNavEnabled';
import type { CloudExperimentsPluginStart } from '@kbn/cloud-experiments-plugin/common';
import type { CloudStart } from '@kbn/cloud-plugin/public';

export const isSolutionNavEnabled = (
  cloud?: CloudStart,
  cloudExperiments?: CloudExperimentsPluginStart
) => {
  return Boolean(cloud?.isCloudEnabled) && cloudExperiments
    ? from(
        cloudExperiments.getVariation(SOLUTION_NAV_FEATURE_FLAG_NAME, false).catch(() => false)
      ).pipe(shareReplay(1))
    : of(false);
};
