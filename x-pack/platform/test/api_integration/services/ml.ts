/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '@kbn/test-suites-xpack/functional/ftr_provider_context';

import { MachineLearningAPIProvider } from '@kbn/test-suites-xpack/functional/services/ml/api';
import { MachineLearningCommonAPIProvider } from '@kbn/test-suites-xpack/functional/services/ml/common_api';
import { MachineLearningCommonConfigsProvider } from '@kbn/test-suites-xpack/functional/services/ml/common_config';
import { MachineLearningSecurityCommonProvider } from '@kbn/test-suites-xpack/functional/services/ml/security_common';
import { MachineLearningTestExecutionProvider } from '@kbn/test-suites-xpack/functional/services/ml/test_execution';
import { MachineLearningTestResourcesProvider } from '@kbn/test-suites-xpack/functional/services/ml/test_resources';

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
