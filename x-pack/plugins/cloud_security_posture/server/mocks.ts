/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import {
  createFleetRequestHandlerContextMock,
  createMockAgentService,
  createMockAgentPolicyService,
  createPackagePolicyServiceMock,
  createMockPackageService,
} from '@kbn/fleet-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

export const createCspRequestHandlerContextMock = () => ({
  core: coreMock.createRequestHandlerContext(),
  fleet: createFleetRequestHandlerContextMock(),
  csp: {
    logger: loggingSystemMock.createLogger(),
    security: securityMock.createStart(),
    fleet: {
      agentPolicyService: createMockAgentPolicyService(),
      agentService: createMockAgentService(),
      packagePolicyService: createPackagePolicyServiceMock(),
      packageService: createMockPackageService(),
    },
  },
});
