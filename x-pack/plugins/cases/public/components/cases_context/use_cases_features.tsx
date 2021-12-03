/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useCasesContext } from './use_cases_context';

interface UseCasesFeaturesReturn {
  isSyncAlertsEnabled: boolean;
}

export const useCasesFeatures = (): UseCasesFeaturesReturn => {
  const { features } = useCasesContext();
  const memoizedReturnValue = useMemo(
    () => ({ isSyncAlertsEnabled: features.alerts.sync }),
    [features]
  );
  return memoizedReturnValue;
};
