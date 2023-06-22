/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../common';

import { packagePolicyService } from '../..';
import { auditLoggingService } from '../../audit_logging';

import { removeInstallation } from './remove';

jest.mock('../..', () => {
  return {
    appContextService: {
      getLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
      }),
    },
    packagePolicyService: {
      list: jest.fn().mockResolvedValue({ total: 1, items: [{ id: 'system-1' }] }),
      delete: jest.fn(),
    },
  };
});
jest.mock('../../audit_logging');

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;

describe('removeInstallation', () => {
  let soClientMock: any;
  const esClientMock = {} as any;
  beforeEach(() => {
    soClientMock = {
      get: jest.fn().mockResolvedValue({ attributes: { installed_kibana: [], installed_es: [] } }),
      delete: jest.fn(),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      bulkResolve: jest.fn().mockResolvedValue({ resolved_objects: [] }),
    } as any;
  });
  it('should remove package policies when force', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'system',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: true,
    });
    expect(mockPackagePolicyService.delete).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['system-1'],
      { force: true }
    );
  });

  it('should throw when trying to remove package with package policies when not force', async () => {
    await expect(
      removeInstallation({
        savedObjectsClient: soClientMock,
        pkgName: 'system',
        pkgVersion: '1.0.0',
        esClient: esClientMock,
        force: false,
      })
    ).rejects.toThrowError(
      `unable to remove package with existing package policy(s) in use by agent(s)`
    );
  });

  it('should call audit logger', async () => {
    await removeInstallation({
      savedObjectsClient: soClientMock,
      pkgName: 'system',
      pkgVersion: '1.0.0',
      esClient: esClientMock,
      force: true,
    });

    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'delete',
      id: 'system',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  });
});
