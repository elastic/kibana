/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from './analytics_service';

export const analyticsServiceMock = {
  createSetup: (): jest.Mocked<AnalyticsServiceSetup> => ({
    reportAuthenticationTypeEvent: jest.fn(),
    reportCSPViolation: jest.fn(),
    reportPermissionsPolicyViolation: jest.fn(),
  }),
};
