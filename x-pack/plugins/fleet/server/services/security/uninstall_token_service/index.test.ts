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

import { SO_SEARCH_LIMIT } from '../../../../common';

import type {
  UninstallToken,
  UninstallTokenMetadata,
} from '../../../../common/types/models/uninstall_token';

import { UNINSTALL_TOKENS_SAVED_OBJECT_TYPE } from '../../../constants';
import { createAppContextStartContractMock, type MockedFleetAppContext } from '../../../mocks';
import { appContextService } from '../../app_context';
import { agentPolicyService } from '../../agent_policy';

import { UninstallTokenService, type UninstallTokenServiceInterface } from '.';

describe('UninstallTokenService', () => {
  const now = new Date().toISOString();
  const aDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

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
          created_at: now,
        }
      : {
          id: 'test-so-id',
          attributes: {
            policy_id: 'test-policy-id',
            token_plain: 'test-token-plain',
          },
          created_at: now,
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
          created_at: aDayAgo,
        }
      : {
          id: 'test-so-id-two',
          attributes: {
            policy_id: 'test-policy-id-two',
            token_plain: 'test-token-plain-two',
          },
          created_at: aDayAgo,
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
                _source: {
                  [UNINSTALL_TOKENS_SAVED_OBJECT_TYPE]: defaultSO.attributes,
                  created_at: defaultSO.created_at,
                },
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
                _source: {
                  [UNINSTALL_TOKENS_SAVED_OBJECT_TYPE]: defaultSO2.attributes,
                  created_at: defaultSO2.created_at,
                },
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
      describe('getToken', () => {
        it('can correctly get one token', async () => {
          const so = getDefaultSO(canEncrypt);
          mockCreatePointInTimeFinderAsInternalUser([so]);

          const token = await uninstallTokenService.getToken(so.id);

          const expectedItem: UninstallToken = {
            id: so.id,
            policy_id: so.attributes.policy_id,
            token: getToken(so, canEncrypt),
            created_at: so.created_at,
          };

          expect(token).toEqual(expectedItem);

          expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).toHaveBeenCalledWith(
            {
              type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
              filter: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.id: "${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}:${so.id}"`,
              perPage: SO_SEARCH_LIMIT,
            }
          );
        });
      });

      describe('getTokenMetadata', () => {
        it('can correctly get token metadata', async () => {
          const so = getDefaultSO(canEncrypt);
          const so2 = getDefaultSO2(canEncrypt);

          const actualItems = (await uninstallTokenService.getTokenMetadata()).items;
          const expectedItems: UninstallTokenMetadata[] = [
            {
              id: so.id,
              policy_id: so.attributes.policy_id,
              created_at: so.created_at,
            },
            {
              id: so2.id,
              policy_id: so2.attributes.policy_id,
              created_at: so2.created_at,
            },
          ];
          expect(actualItems).toEqual(expectedItems);
        });

        it('should throw error if created_at is missing', async () => {
          const defaultBuckets = getDefaultBuckets(canEncrypt);
          defaultBuckets[0].latest.hits.hits[0]._source.created_at = '';
          mockCreatePointInTimeFinder(canEncrypt, defaultBuckets);

          await expect(uninstallTokenService.getTokenMetadata()).rejects.toThrowError(
            'Uninstall Token is missing creation date.'
          );
        });

        it('should throw error if policy_id is missing', async () => {
          const defaultBuckets = getDefaultBuckets(canEncrypt);
          defaultBuckets[0].latest.hits.hits[0]._source[
            UNINSTALL_TOKENS_SAVED_OBJECT_TYPE
          ].policy_id = '';
          mockCreatePointInTimeFinder(canEncrypt, defaultBuckets);

          await expect(uninstallTokenService.getTokenMetadata()).rejects.toThrowError(
            'Uninstall Token is missing policy ID.'
          );
        });
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

      describe('agentTamperProtectionEnabled false', () => {
        beforeAll(() => {
          // @ts-ignore
          mockContext.experimentalFeatures.agentTamperProtectionEnabled = false;
        });

        it('generateTokensForPolicyIds should not generate token if agentTamperProtectionEnabled: false', async () => {
          const so = getDefaultSO();
          await uninstallTokenService.generateTokensForPolicyIds([so.attributes.policy_id]);
          expect(soClientMock.bulkCreate).not.toBeCalled();
        });

        it('generateTokensForAllPolicies should not generate token if agentTamperProtectionEnabled: false', async () => {
          await uninstallTokenService.generateTokensForAllPolicies();
          expect(soClientMock.bulkCreate).not.toBeCalled();
        });

        it('generateTokenForPolicyId should not generate token if agentTamperProtectionEnabled: false', async () => {
          const so = getDefaultSO();
          await uninstallTokenService.generateTokenForPolicyId(so.attributes.policy_id);
          expect(soClientMock.bulkCreate).not.toBeCalled();
        });
      });
    });
  });
});
