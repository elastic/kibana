/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditService } from './audit_service';

export const auditServiceMock = {
  create() {
    return {
      getLogger: jest.fn(),
      asScoped: jest.fn().mockReturnValue({
        log: jest.fn(),
        enabled: true,
      }),
      withoutRequest: {
        log: jest.fn(),
        enabled: true,
      },
    } as jest.Mocked<ReturnType<AuditService['setup']>>;
  },
};
