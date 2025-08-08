/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { TransformAPIProvider } from './api';
import { TransformSecurityCommonProvider } from './security_common';
import { MachineLearningAPIProvider } from '../ml/api';
import { MachineLearningTestResourcesProvider } from '../ml/test_resources';

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
