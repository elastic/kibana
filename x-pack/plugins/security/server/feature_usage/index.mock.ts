/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityFeatureUsageServiceStart } from './feature_usage_service';

export const securityFeatureUsageServiceMock = {
  createStartContract() {
    return {
      recordPreAccessAgreementUsage: jest.fn(),
      recordSubFeaturePrivilegeUsage: jest.fn(),
    } as jest.Mocked<SecurityFeatureUsageServiceStart>;
  },
};
