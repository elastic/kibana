/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeprecationsServiceStart, DomainDeprecationDetails } from '@kbn/core/public';

const kibanaDeprecations: DomainDeprecationDetails[] = [
  {
    correctiveActions: {
      // Only has one manual step.
      manualSteps: ['Step 1'],
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
    configPath: 'test',
  },
  {
    correctiveActions: {
      // Has multiple manual steps.
      manualSteps: ['Step 1', 'Step 2', 'Step 3'],
    },
    domainId: 'test_domain_2',
    level: 'warning',
    title: 'Test deprecation title 1',
    documentationUrl: 'https://',
    message: 'Test deprecation message 2',
    deprecationType: 'feature',
  },
  {
    correctiveActions: {
      // Has no manual steps.
      manualSteps: [],
    },
    domainId: 'test_domain_3',
    level: 'warning',
    title: 'Test deprecation title 3',
    message: 'Test deprecation message 3',
    deprecationType: 'feature',
  },
];

const setLoadDeprecations = ({
  deprecationService,
  response,
  mockRequestErrorMessage,
}: {
  deprecationService: jest.Mocked<DeprecationsServiceStart>;
  response?: DomainDeprecationDetails[];
  mockRequestErrorMessage?: string;
}) => {
  const mockResponse = response ? response : kibanaDeprecations;

  if (mockRequestErrorMessage) {
    return deprecationService.getAllDeprecations.mockRejectedValue(
      new Error(mockRequestErrorMessage)
    );
  }

  return deprecationService.getAllDeprecations.mockReturnValue(Promise.resolve(mockResponse));
};

const setResolveDeprecations = ({
  deprecationService,
  status,
}: {
  deprecationService: jest.Mocked<DeprecationsServiceStart>;
  status: 'ok' | 'fail';
}) => {
  if (status === 'fail') {
    return deprecationService.resolveDeprecation.mockReturnValue(
      Promise.resolve({
        status,
        reason: 'resolve failed',
      })
    );
  }

  return deprecationService.resolveDeprecation.mockReturnValue(
    Promise.resolve({
      status,
    })
  );
};

export const kibanaDeprecationsServiceHelpers = {
  setLoadDeprecations,
  setResolveDeprecations,
  defaultMockedResponses: {
    mockedKibanaDeprecations: kibanaDeprecations,
    mockedCriticalKibanaDeprecations: kibanaDeprecations.filter(
      (deprecation) => deprecation.level === 'critical'
    ),
    mockedWarningKibanaDeprecations: kibanaDeprecations.filter(
      (deprecation) => deprecation.level === 'warning'
    ),
    mockedConfigKibanaDeprecations: kibanaDeprecations.filter(
      (deprecation) => deprecation.deprecationType === 'config'
    ),
  },
};
