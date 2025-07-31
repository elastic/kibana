/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { MachineLearningAPIProvider } from './api';
import { MachineLearningCommonAPIProvider } from './common_api';
import { MachineLearningCommonConfigsProvider } from './common_config';
import { MachineLearningSecurityCommonProvider } from './security_common';
import { MachineLearningTestExecutionProvider } from './test_execution';
import { MachineLearningTestResourcesProvider } from './test_resources';

export function MachineLearningProvider(context: FtrProviderContext) {
  const api = MachineLearningAPIProvider(context);
  const commonAPI = MachineLearningCommonAPIProvider(context);
  const commonConfig = MachineLearningCommonConfigsProvider(context);
  const securityCommon = MachineLearningSecurityCommonProvider(context);
  const testExecution = MachineLearningTestExecutionProvider(context);
  const testResources = MachineLearningTestResourcesProvider(context, api);

  return {
    api,
    commonAPI,
    commonConfig,
    securityCommon,
    testExecution,
    testResources,
  };
}
