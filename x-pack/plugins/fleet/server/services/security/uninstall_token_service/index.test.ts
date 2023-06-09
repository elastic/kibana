/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import type { UninstallToken } from '../../../../common/types/models/uninstall_token';

import { UNINSTALL_TOKENS_SAVED_OBJECT_TYPE } from '../../../constants';
import { createAppContextStartContractMock, type MockedFleetAppContext } from '../../../mocks';
import { appContextService } from '../../app_context';
import { agentPolicyService } from '../../agent_policy';

import { UninstallTokenService, type UninstallTokenServiceInterface } from '.';

describe('UninstallTokenService', () => {
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let esoClientMock: jest.Mocked<EncryptedSavedObjectsClient>;
  let mockContext: MockedFleetAppContext;
  let mockBuckets: any[] = [];
  let uninstallTokenService: UninstallTokenServiceInterface;

  function getDefaultSO(encrypted: boolean = true) {
    return encrypted
      ? {
          id: 'test-so-id',
          attributes: {
            policy_id: 'test-policy-id',
            token: 'test-token',
          },
          created_at: 'yesterday',
        }
      : {
          id: 'test-so-id',
          attributes: {
            policy_id: 'test-policy-id',
            token_plain: 'test-token-plain',
          },
          created_at: 'yesterday',
        };
  }

  function getDefaultSO2(encrypted: boolean = true) {
    return encrypted
      ? {
          id: 'test-so-id-two',
          attributes: {
            policy_id: 'test-policy-id-two',
            token: 'test-token-two',
          },
        }
      : {
          id: 'test-so-id-two',
          attributes: {
            policy_id: 'test-policy-id-two',
            token_plain: 'test-token-plain-two',
          },
        };
  }

  function getDefaultBuckets(encrypted: boolean = true) {
    const defaultSO = getDefaultSO(encrypted);
    const defaultSO2 = getDefaultSO2(encrypted);
    return [
      {
        key: 'test-policy-id',
        latest: {
          hits: {
            hits: [
              {
                _id: defaultSO.id,
                ...defaultSO,
              },
            ],
          },
        },
      },
      {
        key: 'test-policy-id-two',
        latest: {
          hits: {
            hits: [
              {
                _id: defaultSO2.id,
                ...defaultSO2,
              },
            ],
          },
        },
      },
    ];
  }

  function mockFind(encrypted: boolean = true, savedObjects?: any[]) {
    soClientMock.find = jest.fn().mockResolvedValue({
      saved_objects:
        savedObjects ?? getDefaultBuckets(encrypted).map((bucket) => ({ id: bucket.key })),
    });
  }

  function mockCreatePointInTimeFinder(encrypted: boolean = true, buckets?: any[]) {
    mockBuckets = buckets ?? getDefaultBuckets(encrypted);

    soClientMock.createPointInTimeFinder = jest.fn().mockReturnValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield {
          aggregations: {
            by_policy_id: {
              buckets: mockBuckets,
            },
          },
        };
      },
    });
  }

  function mockCreatePointInTimeFinderAsInternalUser(savedObjects?: any[]) {
    esoClientMock.createPointInTimeFinderDecryptedAsInternalUser = jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield {
          saved_objects: savedObjects ?? mockBuckets.map(({ latest }) => latest.hits.hits[0]),
        };
      },
    });
  }

  function setupMocks(canEncrypt: boolean = true) {
    mockContext = createAppContextStartContractMock();
    mockContext.encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup({
      canEncrypt,
    });
    appContextService.start(mockContext);
    esoClientMock =
      mockContext.encryptedSavedObjectsStart!.getClient() as jest.Mocked<EncryptedSavedObjectsClient>;
    soClientMock = appContextService
      .getSavedObjects()
      .getScopedClient({} as unknown as KibanaRequest) as jest.Mocked<SavedObjectsClientContract>;
    agentPolicyService.deployPolicies = jest.fn();

    uninstallTokenService = new UninstallTokenService(esoClientMock);
    mockFind(canEncrypt);
    mockCreatePointInTimeFinder(canEncrypt);
    mockCreatePointInTimeFinderAsInternalUser();
  }

  function getToken(so: any, canEncrypt: boolean) {
    return canEncrypt ? so.attributes.token : so.attributes.token_plain;
  }

  function hashToken(token?: string): string {
    if (!token) return '';
    return createHash('sha256').update(token).digest('base64');
  }

  afterEach(() => {
    mockBuckets = [];
    jest.resetAllMocks();
  });

  describe.each([
    ['with encryption key configured', true],
    ['with encryption key NOT configured', false],
  ])('%s', (_, canEncrypt) => {
    const expectAnyToken = canEncrypt
      ? { token: expect.any(String) }
      : { token_plain: expect.any(String) };

    beforeEach(() => {
      setupMocks(canEncrypt);
    });

    describe('get uninstall tokens', () => {
      it('can correctly getTokenForPolicyId', async () => {
        const so = getDefaultSO(canEncrypt);
        const token = await uninstallTokenService.getTokenForPolicyId(so.attributes.policy_id);
        expect(token).toEqual({
          policy_id: so.attributes.policy_id,
          token: getToken(so, canEncrypt),
          created_at: 'yesterday',
        } as UninstallToken);
      });

      it('can correctly getTokensForPolicyIds', async () => {
        const so = getDefaultSO(canEncrypt);
        const so2 = getDefaultSO2(canEncrypt);

        const tokensMap = await uninstallTokenService.getTokensForPolicyIds([
          so.attributes.policy_id,
          so2.attributes.policy_id,
        ]);
        expect(tokensMap).toEqual([
          {
            policy_id: so.attributes.policy_id,
            token: getToken(so, canEncrypt),
            created_at: 'yesterday',
          },
          {
            policy_id: so2.attributes.policy_id,
            token: getToken(so2, canEncrypt),
          },
        ] as UninstallToken[]);
      });

      it('can correctly getAllTokens', async () => {
        const so = getDefaultSO(canEncrypt);
        const so2 = getDefaultSO2(canEncrypt);

        const tokensMap = (await uninstallTokenService.getAllTokens()).items;
        expect(tokensMap).toEqual([
          {
            policy_id: so.attributes.policy_id,
            token: getToken(so, canEncrypt),
            created_at: 'yesterday',
          },
          {
            policy_id: so2.attributes.policy_id,
            token: getToken(so2, canEncrypt),
          },
        ] as UninstallToken[]);
      });
    });

    describe('get hashed uninstall tokens', () => {
      it('can correctly getHashedTokenForPolicyId', async () => {
        const so = getDefaultSO(canEncrypt);

        const token = await uninstallTokenService.getHashedTokenForPolicyId(
          so.attributes.policy_id
        );
        expect(token).toBe(hashToken(getToken(so, canEncrypt)));
      });

      it('can correctly getHashedTokensForPolicyIds', async () => {
        const so = getDefaultSO(canEncrypt);
        const so2 = getDefaultSO2(canEncrypt);

        const tokensMap = await uninstallTokenService.getHashedTokensForPolicyIds([
          so.attributes.policy_id,
          so2.attributes.policy_id,
        ]);
        expect(tokensMap).toEqual({
          [so.attributes.policy_id]: hashToken(getToken(so, canEncrypt)),
          [so2.attributes.policy_id]: hashToken(getToken(so2, canEncrypt)),
        });
      });

      it('can correctly getAllHashedTokens', async () => {
        const so = getDefaultSO(canEncrypt);
        const so2 = getDefaultSO2(canEncrypt);

        const tokensMap = await uninstallTokenService.getAllHashedTokens();
        expect(tokensMap).toEqual({
          [so.attributes.policy_id]: hashToken(getToken(so, canEncrypt)),
          [so2.attributes.policy_id]: hashToken(getToken(so2, canEncrypt)),
        });
      });
    });

    describe('token generation', () => {
      describe('existing token', () => {
        describe('force = false', () => {
          it('does not create new token when calling generateTokenForPolicyId', async () => {
            const so = getDefaultSO(canEncrypt);
            await uninstallTokenService.generateTokenForPolicyId(so.attributes.policy_id);
            expect(soClientMock.bulkCreate).not.toBeCalled();
          });

          it('does not create new token when calling generateTokensForPolicyIds', async () => {
            const so = getDefaultSO(canEncrypt);
            await uninstallTokenService.generateTokensForPolicyIds([so.attributes.policy_id]);
            expect(soClientMock.bulkCreate).not.toBeCalled();
          });

          it('does not create new token when calling generateTokensForAllPolicies', async () => {
            await uninstallTokenService.generateTokensForAllPolicies();
            expect(soClientMock.bulkCreate).not.toBeCalled();
          });
        });

        describe('force = true', () => {
          it('creates a new token when calling generateTokenForPolicyId', async () => {
            const so = getDefaultSO(canEncrypt);
            await uninstallTokenService.generateTokenForPolicyId(so.attributes.policy_id, true);

            expect(soClientMock.bulkCreate).toBeCalledWith([
              {
                type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
                attributes: {
                  policy_id: so.attributes.policy_id,
                  ...expectAnyToken,
                },
              },
            ]);
            expect(agentPolicyService.deployPolicies).toBeCalledWith(soClientMock, [
              so.attributes.policy_id,
            ]);
          });

          it('creates a new token when calling generateTokensForPolicyIds', async () => {
            const so = getDefaultSO(canEncrypt);
            const so2 = getDefaultSO2(canEncrypt);

            await uninstallTokenService.generateTokensForPolicyIds(
              [so.attributes.policy_id, so2.attributes.policy_id],
              true
            );
            expect(soClientMock.bulkCreate).toBeCalledWith([
              {
                type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
                attributes: {
                  policy_id: so.attributes.policy_id,
                  ...expectAnyToken,
                },
              },
              {
                type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
                attributes: {
                  policy_id: so2.attributes.policy_id,
                  ...expectAnyToken,
                },
              },
            ]);
            expect(agentPolicyService.deployPolicies).toBeCalledWith(soClientMock, [
              so.attributes.policy_id,
              so2.attributes.policy_id,
            ]);
          });

          it('creates a new token when calling generateTokensForAllPolicies', async () => {
            const so = getDefaultSO(canEncrypt);
            const so2 = getDefaultSO2(canEncrypt);

            await uninstallTokenService.generateTokensForAllPolicies(true);
            expect(soClientMock.bulkCreate).toBeCalledWith([
              {
                type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
                attributes: {
                  policy_id: so.attributes.policy_id,
                  ...expectAnyToken,
                },
              },
              {
                type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
                attributes: {
                  policy_id: so2.attributes.policy_id,
                  ...expectAnyToken,
                },
              },
            ]);
            expect(agentPolicyService.deployPolicies).toBeCalledWith(soClientMock, [
              so.attributes.policy_id,
              so2.attributes.policy_id,
            ]);
          });
        });
      });

      describe('no existing token', () => {
        beforeEach(() => {
          mockCreatePointInTimeFinder(true, []);
          mockCreatePointInTimeFinderAsInternalUser([]);
        });

        it('creates a new token when calling generateTokenForPolicyId', async () => {
          const so = getDefaultSO(canEncrypt);
          await uninstallTokenService.generateTokenForPolicyId(so.attributes.policy_id);
          expect(soClientMock.bulkCreate).toBeCalledWith([
            {
              type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
              attributes: {
                policy_id: so.attributes.policy_id,
                ...expectAnyToken,
              },
            },
          ]);
        });

        it('creates a new token when calling generateTokensForPolicyIds', async () => {
          const so = getDefaultSO(canEncrypt);
          const so2 = getDefaultSO2(canEncrypt);

          await uninstallTokenService.generateTokensForPolicyIds([
            so.attributes.policy_id,
            so2.attributes.policy_id,
          ]);
          expect(soClientMock.bulkCreate).toBeCalledWith([
            {
              type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
              attributes: {
                policy_id: so.attributes.policy_id,
                ...expectAnyToken,
              },
            },
            {
              type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
              attributes: {
                policy_id: so2.attributes.policy_id,
                ...expectAnyToken,
              },
            },
          ]);
        });

        it('creates a new token when calling generateTokensForAllPolicies', async () => {
          const so = getDefaultSO(canEncrypt);
          const so2 = getDefaultSO2(canEncrypt);

          await uninstallTokenService.generateTokensForAllPolicies();
          expect(soClientMock.bulkCreate).toBeCalledWith([
            {
              type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
              attributes: {
                policy_id: so.attributes.policy_id,
                ...expectAnyToken,
              },
            },
            {
              type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
              attributes: {
                policy_id: so2.attributes.policy_id,
                ...expectAnyToken,
              },
            },
          ]);
        });
      });
    });
  });
});
