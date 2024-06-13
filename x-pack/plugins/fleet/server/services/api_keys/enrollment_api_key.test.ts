/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { Logger } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import { ENROLLMENT_API_KEYS_INDEX } from '../../constants';

import { agentPolicyService } from '../agent_policy';
import { auditLoggingService } from '../audit_logging';
import { appContextService } from '../app_context';

import { deleteEnrollmentApiKey, generateEnrollmentAPIKey } from './enrollment_api_key';

jest.mock('../audit_logging');
jest.mock('../agent_policy');
jest.mock('../app_context');

jest.mock('uuid', () => {
  return {
    v4: () => 'mock-uuid',
  };
});

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

let mockedLogger: jest.Mocked<Logger>;

describe('enrollment api keys', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateEnrollmentAPIKey', () => {
    it('should call audit logger', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      esClient.create.mockResolvedValue({
        _id: 'test-enrollment-api-key-id',
      } as any);

      esClient.security.createApiKey.mockResolvedValue({
        api_key: 'test-api-key-value',
        id: 'test-api-key-id',
      } as any);

      mockedAgentPolicyService.get.mockResolvedValue({
        id: 'test-agent-policy',
      } as any);

      await generateEnrollmentAPIKey(soClient, esClient, {
        name: 'test-api-key',
        expiration: '7d',
        agentPolicyId: 'test-agent-policy',
        forceRecreate: true,
      });

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message:
          'User creating enrollment API key [name=test-api-key (mock-uuid)] [policy_id=test-agent-policy]',
      });
    });

    it('should set namespaces if agent policy specify a space ID', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      esClient.create.mockResolvedValue({
        _id: 'test-enrollment-api-key-id',
      } as any);

      esClient.security.createApiKey.mockResolvedValue({
        api_key: 'test-api-key-value',
        id: 'test-api-key-id',
      } as any);

      mockedAgentPolicyService.get.mockResolvedValue({
        id: 'test-agent-policy',
        space_id: 'test123',
      } as any);

      await generateEnrollmentAPIKey(soClient, esClient, {
        name: 'test-api-key',
        expiration: '7d',
        agentPolicyId: 'test-agent-policy',
        forceRecreate: true,
      });

      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            namespaces: ['test123'],
          }),
        })
      );
    });
  });

  describe('deleteEnrollmentApiKey', () => {
    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      esClient.update.mockResolvedValue({} as any);

      esClient.get.mockResolvedValue({
        _id: 'test-id',
        _index: ENROLLMENT_API_KEYS_INDEX,
        _source: {
          active: true,
          created_at: new Date().toISOString(),
          api_key_id: 'test-enrollment-api-key-id',
        },
        found: true,
      });

      mockedAppContextService.getSecurity.mockReturnValue({
        authc: {
          apiKeys: {
            invalidateAsInternalUser: jest.fn().mockResolvedValue({}),
          },
        },
      } as any);

      await deleteEnrollmentApiKey(esClient, 'test-enrollment-api-key-id');

      expect(auditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message:
          'User deleting enrollment API key [id=test-id] [api_key_id=test-enrollment-api-key-id]',
      });
    });
  });
});
