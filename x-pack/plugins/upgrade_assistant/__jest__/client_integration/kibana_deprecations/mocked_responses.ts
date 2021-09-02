/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DomainDeprecationDetails } from 'kibana/public';

export const kibanaDeprecationsMockResponse: DomainDeprecationDetails[] = [
  {
    correctiveActions: {
      manualSteps: ['Step 1', 'Step 2', 'Step 3'],
      api: {
        method: 'POST',
        path: '/test',
      },
    },
    domainId: 'test_domain_1',
    level: 'critical',
    title: 'Test deprecation title 1',
    message: 'Test deprecation message 1',
    deprecationType: 'config',
  },
  {
    correctiveActions: {
      manualSteps: ['Step 1', 'Step 2', 'Step 3'],
    },
    domainId: 'test_domain_2',
    level: 'warning',
    title: 'Test deprecation title 1',
    message: 'Test deprecation message 2',
    deprecationType: 'feature',
  },
];
