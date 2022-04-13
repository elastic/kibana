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

export const useCasesFeatures = (): UseCasesFeatures => {
  const { features } = useCasesContext();
  const casesFeatures = useMemo(
    () => ({
      isAlertsEnabled: features.alerts.enabled,
      /**
       * If the alerts feature is disabled we will disable everything.
       * If not, then we honor the sync option.
       * The sync and enabled option in DEFAULT_FEATURES in x-pack/plugins/cases/common/constants.ts
       * is defaulted to true. This will help consumers to set the enabled
       * option to true and get the whole alerts experience without the need
       * to explicitly set the sync to true
       */
      isSyncAlertsEnabled: !features.alerts.enabled ? false : features.alerts.sync,
      metricsFeatures: features.metrics,
    }),
    [features.alerts.enabled, features.alerts.sync, features.metrics]
  );
  return casesFeatures;
};
