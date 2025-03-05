/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '@kbn/test-suites-xpack/functional/ftr_provider_context';

import { TransformAPIProvider } from '@kbn/test-suites-xpack/functional/services/transform/api';
import { TransformSecurityCommonProvider } from '@kbn/test-suites-xpack/functional/services/transform/security_common';
import { MachineLearningAPIProvider } from '@kbn/test-suites-xpack/functional/services/ml/api';
import { MachineLearningTestResourcesProvider } from '@kbn/test-suites-xpack/functional/services/ml/test_resources';

export function TransformProvider(context: FtrProviderContext) {
  const api = TransformAPIProvider(context);
  const mlApi = MachineLearningAPIProvider(context);
  const securityCommon = TransformSecurityCommonProvider(context);
  const testResources = MachineLearningTestResourcesProvider(context, mlApi);

  return {
    api,
    securityCommon,
    testResources,
  };
}
