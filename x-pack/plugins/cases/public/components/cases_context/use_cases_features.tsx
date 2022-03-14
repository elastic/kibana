/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CaseMetricsFeature } from '../../containers/types';
import { useCasesContext } from './use_cases_context';

export interface UseCasesFeatures {
  isAlertsEnabled: boolean;
  isSyncAlertsEnabled: boolean;
  metricsFeatures: CaseMetricsFeature[];
}

const isObject = (obj: unknown): obj is object => {
  return typeof obj === 'object' && obj != null;
};

export const useCasesFeatures = (): UseCasesFeatures => {
  const { features } = useCasesContext();
  const casesFeatures = useMemo(
    () => ({
      isAlertsEnabled: !!features.alerts,
      isSyncAlertsEnabled: isObject(features.alerts) ? features.alerts.sync : features.alerts,
      metricsFeatures: features.metrics,
    }),
    [features]
  );
  return casesFeatures;
};
