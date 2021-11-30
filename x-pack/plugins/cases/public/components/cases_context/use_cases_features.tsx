/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesContextValue } from '../../../common';
import { useCasesContext } from './use_cases_context';

interface UseCasesFeaturesReturn {
  features: CasesContextValue['features'];
  syncAlerts: boolean;
}

export const useCasesFeatures = (): UseCasesFeaturesReturn => {
  const { features } = useCasesContext();
  return { features, syncAlerts: features.alerts.sync };
};
