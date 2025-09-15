/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { MachineLearningNavigationProviderObservability } from './observability_navigation';
import { MachineLearningNavigationProviderSecurity } from './security_navigation';

export function MachineLearningProvider(context: FtrProviderContext) {
  const observabilityNavigation = MachineLearningNavigationProviderObservability(context);
  const securityNavigation = MachineLearningNavigationProviderSecurity(context);

  return {
    navigation: {
      observability: observabilityNavigation,
      security: securityNavigation,
    },
  };
}
