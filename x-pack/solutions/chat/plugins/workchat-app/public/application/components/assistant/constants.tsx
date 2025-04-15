/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assistantLabels } from './i18n';

export const ASSISTANT_USE_CASES = [
  { value: 'customerSupport', label: assistantLabels.useCase.customerSupportLabel, prompt: '' },
  { value: 'dataAnalysis', label: assistantLabels.useCase.dataAnalysisLabel, prompt: '' },
  { value: 'custom', label: assistantLabels.useCase.customLabel },
];
