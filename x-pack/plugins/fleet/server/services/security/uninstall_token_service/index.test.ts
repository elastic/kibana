/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { KibanaRequest } from '@kbn/core-http-server';

import {
  SECURITY_EXTENSION_ID,
  SPACES_EXTENSION_ID,
  type SavedObjectsClientContract,
} from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import { errors } from '@elastic/elasticsearch';

import { UninstallTokenError } from '../../../../common/errors';

import type { AgentPolicy } from '../../../../common';
import { SO_SEARCH_LIMIT } from '../../../../common';

import type {
  UninstallToken,
  UninstallTokenMetadata,
} from '../../../../common/types/models/uninstall_token';

import { UNINSTALL_TOKENS_SAVED_OBJECT_TYPE } from '../../../constants';
import { createAppContextStartContractMock, type MockedFleetAppContext } from '../../../mocks';
import { appContextService } from '../../app_context';
import { agentPolicyService } from '../../agent_policy';
import { isSpaceAwarenessEnabled } from '../../spaces/helpers';

import { UninstallTokenService, type UninstallTokenServiceInterface } from '.';

interface TokenSO {
  id: string;
  attributes: {
    policy_id: string;
    token?: string;
    token_plain?: string;
  };
  created_at: string;
}

jest.mock('../../spaces/helpers');

describe('UninstallTokenService', () => {
  const now = new Date().toISOString();
  const aDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let esoClientMock: jest.Mocked<EncryptedSavedObjectsClient>;
  let mockContext: MockedFleetAppContext;
  let mockBuckets: any[] = [];
  let uninstallTokenService: UninstallTokenServiceInterface;
  let getAgentPoliciesByIDsMock: jest.Mock;

  function getDefaultSO(encrypted: boolean = true): TokenSO {
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

  function getDefaultSO2(encrypted: boolean = true): TokenSO {
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

  const decorateSOWithError = (so: TokenSO) => ({
    ...so,
    error: new Error('error reason'),
  });

  const decorateSOWithMissingToken = (so: TokenSO) => ({
    ...so,
    attributes: {
      ...so.attributes,
      token: undefined,
      token_plain: undefined,
    },
  });

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

  function mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt = true, items?: string[]) {
    const so = getDefaultSO(canEncrypt);
    const so2 = getDefaultSO2(canEncrypt);

    agentPolicyService.fetchAllAgentPolicyIds = jest.fn().mockResolvedValue(
      jest.fn(async function* () {
        yield items || [so.attributes.policy_id, so2.attributes.policy_id];
      })()
    );
  }

  function setupMocks(canEncrypt: boolean = true, scoppedInSpace?: string) {
    mockContext = createAppContextStartContractMock();
    mockContext.encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup({
      canEncrypt,
    });
    appContextService.start(mockContext);
    esoClientMock =
      mockContext.encryptedSavedObjectsStart!.getClient() as jest.Mocked<EncryptedSavedObjectsClient>;
    soClientMock = appContextService
      .getSavedObjects()
      .getScopedClient({} as unknown as KibanaRequest, {
        excludedExtensions: [SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID],
      }) as jest.Mocked<SavedObjectsClientContract>;
    agentPolicyService.deployPolicies = jest.fn();

    getAgentPoliciesByIDsMock = jest.fn().mockResolvedValue([]);
    agentPolicyService.getByIDs = getAgentPoliciesByIDsMock;

    if (scoppedInSpace) {
      soClientMock.getCurrentNamespace.mockReturnValue(scoppedInSpace);
    }

    uninstallTokenService = new UninstallTokenService(
      esoClientMock,
      scoppedInSpace ? soClientMock : undefined
    );
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
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
    });

    describe('get uninstall tokens', () => {
      describe('getToken', () => {
        it('can correctly get one token', async () => {
          const so = getDefaultSO(canEncrypt);
          mockCreatePointInTimeFinderAsInternalUser([so]);
          getAgentPoliciesByIDsMock.mockResolvedValue([
            { id: so.attributes.policy_id, name: 'cheese' },
          ] as Array<Partial<AgentPolicy>>);

          const token = await uninstallTokenService.getToken(so.id);

          const expectedItem: UninstallToken = {
            id: so.id,
            policy_id: so.attributes.policy_id,
            policy_name: 'cheese',
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
          expect(getAgentPoliciesByIDsMock).toHaveBeenCalledWith(
            soClientMock,
            [so.attributes.policy_id],
            { ignoreMissing: true }
          );
        });

        it('filter namespace with scopped service and space awareneness enabled', async () => {
          jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
          setupMocks(canEncrypt, 'test');

          const so = getDefaultSO(canEncrypt);
          mockCreatePointInTimeFinderAsInternalUser([so]);
          getAgentPoliciesByIDsMock.mockResolvedValue([
            { id: so.attributes.policy_id, name: 'cheese' },
          ] as Array<Partial<AgentPolicy>>);

          const token = await uninstallTokenService.getToken(so.id);

          const expectedItem: UninstallToken = {
            id: so.id,
            policy_id: so.attributes.policy_id,
            policy_name: 'cheese',
            token: getToken(so, canEncrypt),
            created_at: so.created_at,
          };

          expect(token).toEqual(expectedItem);

          expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).toHaveBeenCalledWith(
            {
              type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
              filter: `(${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.namespaces:test) and (${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.id: "${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}:${so.id}")`,
              perPage: SO_SEARCH_LIMIT,
            }
          );
          expect(getAgentPoliciesByIDsMock).toHaveBeenCalledWith(
            soClientMock,
            [so.attributes.policy_id],
            { ignoreMissing: true }
          );
        });

        it('do not filter namespace with scopped service and space awareneness disabled', async () => {
          jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
          setupMocks(canEncrypt, 'test');

          const so = getDefaultSO(canEncrypt);
          mockCreatePointInTimeFinderAsInternalUser([so]);
          getAgentPoliciesByIDsMock.mockResolvedValue([
            { id: so.attributes.policy_id, name: 'cheese' },
          ] as Array<Partial<AgentPolicy>>);

          const token = await uninstallTokenService.getToken(so.id);

          const expectedItem: UninstallToken = {
            id: so.id,
            policy_id: so.attributes.policy_id,
            policy_name: 'cheese',
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
          expect(getAgentPoliciesByIDsMock).toHaveBeenCalledWith(
            soClientMock,
            [so.attributes.policy_id],
            { ignoreMissing: true }
          );
        });

        it('sets `policy_name` to `null` if linked policy does not exist', async () => {
          const so = getDefaultSO(canEncrypt);
          mockCreatePointInTimeFinderAsInternalUser([so]);

          const token = await uninstallTokenService.getToken(so.id);

          const expectedItem: UninstallToken = {
            id: so.id,
            policy_id: so.attributes.policy_id,
            policy_name: null,
            token: getToken(so, canEncrypt),
            created_at: so.created_at,
          };

          expect(token).toEqual(expectedItem);
        });

        it('throws error if token is missing', async () => {
          const so = decorateSOWithMissingToken(getDefaultSO(canEncrypt));
          mockCreatePointInTimeFinderAsInternalUser([so]);

          await expect(uninstallTokenService.getToken(so.id)).rejects.toThrowError(
            new UninstallTokenError(
              'Invalid uninstall token: Saved object is missing the token attribute.'
            )
          );
        });

        it("throws error if there's a depcryption error", async () => {
          const so = decorateSOWithError(getDefaultSO2(canEncrypt));
          mockCreatePointInTimeFinderAsInternalUser([so]);

          await expect(uninstallTokenService.getToken(so.id)).rejects.toThrowError(
            new UninstallTokenError("Error when reading Uninstall Token with id 'test-so-id-two'.")
          );
        });
      });

      describe('getTokenMetadata', () => {
        it('can correctly get token metadata', async () => {
          const so = getDefaultSO(canEncrypt);
          const so2 = getDefaultSO2(canEncrypt);
          getAgentPoliciesByIDsMock.mockResolvedValue([
            { id: so2.attributes.policy_id, name: 'only I have a name' },
          ] as Array<Partial<AgentPolicy>>);

          const actualItems = (await uninstallTokenService.getTokenMetadata()).items;
          const expectedItems: UninstallTokenMetadata[] = [
            {
              id: so.id,
              policy_id: so.attributes.policy_id,
              policy_name: null,
              created_at: so.created_at,
            },
            {
              id: so2.id,
              policy_id: so2.attributes.policy_id,
              policy_name: 'only I have a name',
              created_at: so2.created_at,
            },
          ];
          expect(actualItems).toEqual(expectedItems);
        });

        it('filter by namespace if service is scopped and space awareness is enabled', async () => {
          setupMocks(canEncrypt, 'test');
          jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
          const so = getDefaultSO(canEncrypt);
          const so2 = getDefaultSO2(canEncrypt);
          getAgentPoliciesByIDsMock.mockResolvedValue([
            { id: so2.attributes.policy_id, name: 'only I have a name' },
          ] as Array<Partial<AgentPolicy>>);

          const actualItems = (await uninstallTokenService.getTokenMetadata()).items;
          const expectedItems: UninstallTokenMetadata[] = [
            {
              id: so.id,
              policy_id: so.attributes.policy_id,
              policy_name: null,
              created_at: so.created_at,
            },
            {
              id: so2.id,
              policy_id: so2.attributes.policy_id,
              policy_name: 'only I have a name',
              created_at: so2.created_at,
            },
          ];
          expect(actualItems).toEqual(expectedItems);

          expect(soClientMock.createPointInTimeFinder).toHaveBeenCalledWith(
            expect.objectContaining({
              filter: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.namespaces:test`,
            })
          );
        });

        it('do not filter by namespace if service is scopped and space awareness is disabled', async () => {
          setupMocks(canEncrypt, 'test');
          jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
          const so = getDefaultSO(canEncrypt);
          const so2 = getDefaultSO2(canEncrypt);
          getAgentPoliciesByIDsMock.mockResolvedValue([
            { id: so2.attributes.policy_id, name: 'only I have a name' },
          ] as Array<Partial<AgentPolicy>>);

          const actualItems = (await uninstallTokenService.getTokenMetadata()).items;
          const expectedItems: UninstallTokenMetadata[] = [
            {
              id: so.id,
              policy_id: so.attributes.policy_id,
              policy_name: null,
              created_at: so.created_at,
            },
            {
              id: so2.id,
              policy_id: so2.attributes.policy_id,
              policy_name: 'only I have a name',
              created_at: so2.created_at,
            },
          ];
          expect(actualItems).toEqual(expectedItems);

          expect(soClientMock.createPointInTimeFinder).toHaveBeenCalledWith(
            expect.objectContaining({
              filter: undefined,
            })
          );
        });

        it('should throw error if created_at is missing', async () => {
          const defaultBuckets = getDefaultBuckets(canEncrypt);
          defaultBuckets[0].latest.hits.hits[0]._source.created_at = '';
          mockCreatePointInTimeFinder(canEncrypt, defaultBuckets);

          await expect(uninstallTokenService.getTokenMetadata()).rejects.toThrowError(
            'Invalid uninstall token: Saved object is missing creation date.'
          );
        });

        it('should throw error if policy_id is missing', async () => {
          const defaultBuckets = getDefaultBuckets(canEncrypt);
          defaultBuckets[0].latest.hits.hits[0]._source[
            UNINSTALL_TOKENS_SAVED_OBJECT_TYPE
          ].policy_id = '';
          mockCreatePointInTimeFinder(canEncrypt, defaultBuckets);

          await expect(uninstallTokenService.getTokenMetadata()).rejects.toThrowError(
            'Invalid uninstall token: Saved object is missing the policy id attribute.'
          );
        });
      });

      describe('prepareSearchString', () => {
        let prepareSearchString: (
          str: string | undefined,
          charactersToEscape: RegExp,
          wildcard: string
        ) => string | undefined;

        beforeEach(() => {
          ({ prepareSearchString } = uninstallTokenService as unknown as {
            prepareSearchString: typeof prepareSearchString;
          });
        });

        it('should generate search string with given wildcard', () => {
          expect(prepareSearchString('input', /^$/, '*')).toEqual('*input*');
          expect(prepareSearchString('another', /^$/, '.*')).toEqual('.*another.*');
        });

        it('should escape given special characters', () => {
          expect(prepareSearchString('_in:put', /[:]/, '*')).toEqual('*_in\\:put*');
        });

        it('should escape multiple characters', () => {
          expect(prepareSearchString('<<input>>', /[<>]/, '*')).toEqual('*\\<\\<input\\>\\>*');
        });

        it('should keep digits, letters and dash', () => {
          expect(prepareSearchString('123-ABC-XYZ-4567890', /^$/, '*')).toEqual(
            '*123-ABC-XYZ-4567890*'
          );
        });

        it('should return undefined if input is undefined', () => {
          expect(prepareSearchString(undefined, /^$/, '*')).toEqual(undefined);
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

        mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);

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
            mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);

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

            mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);

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

          mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);

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
          mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);
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

    describe('check validity of tokens', () => {
      const okaySO = getDefaultSO(canEncrypt);

      const errorWithDecryptionSO1 = decorateSOWithError(getDefaultSO(canEncrypt));
      const errorWithDecryptionSO2 = decorateSOWithError(getDefaultSO2(canEncrypt));
      const missingTokenSO2 = decorateSOWithMissingToken(getDefaultSO2(canEncrypt));

      describe('checkTokenValidityForAllPolicies', () => {
        it('returns null if all of the tokens are available', async () => {
          mockCreatePointInTimeFinderAsInternalUser();

          mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);

          await expect(
            uninstallTokenService.checkTokenValidityForAllPolicies()
          ).resolves.toBeNull();
        });

        describe('avoiding `too_many_nested_clauses` error', () => {
          it('performs one query if number of policies is smaller than batch size', async () => {
            mockCreatePointInTimeFinderAsInternalUser();

            mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);

            await uninstallTokenService.checkTokenValidityForAllPolicies();

            expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).toBeCalledTimes(1);
            expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).toBeCalledWith({
              filter:
                'fleet-uninstall-tokens.id: "test-so-id" or fleet-uninstall-tokens.id: "test-so-id-two"',
              perPage: 10000,
              type: 'fleet-uninstall-tokens',
            });
          });

          it('performs multiple queries if number of policies is larger than batch size', async () => {
            // @ts-ignore
            appContextService.getConfig().setup = { uninstallTokenVerificationBatchSize: 1 };

            mockCreatePointInTimeFinderAsInternalUser();

            mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);

            await uninstallTokenService.checkTokenValidityForAllPolicies();

            expect(esoClientMock.createPointInTimeFinderDecryptedAsInternalUser).toBeCalledTimes(2);

            expect(
              esoClientMock.createPointInTimeFinderDecryptedAsInternalUser
            ).toHaveBeenNthCalledWith(1, {
              filter: 'fleet-uninstall-tokens.id: "test-so-id"',
              perPage: 10000,
              type: 'fleet-uninstall-tokens',
            });

            expect(
              esoClientMock.createPointInTimeFinderDecryptedAsInternalUser
            ).toHaveBeenNthCalledWith(2, {
              filter: 'fleet-uninstall-tokens.id: "test-so-id-two"',
              perPage: 10000,
              type: 'fleet-uninstall-tokens',
            });
          });
        });

        it('returns error if any of the tokens is missing', async () => {
          mockCreatePointInTimeFinderAsInternalUser([okaySO, missingTokenSO2]);

          mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt, [
            okaySO.attributes.policy_id,
            missingTokenSO2.attributes.policy_id,
          ]);

          await expect(
            uninstallTokenService.checkTokenValidityForAllPolicies()
          ).resolves.toStrictEqual({
            error: new UninstallTokenError(
              'Failed to validate Uninstall Tokens: 1 of 2 tokens are invalid'
            ),
          });
        });

        it('returns error if some of the tokens cannot be decrypted', async () => {
          mockCreatePointInTimeFinderAsInternalUser([okaySO, errorWithDecryptionSO2]);

          mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt, [
            okaySO.attributes.policy_id,
            errorWithDecryptionSO2.attributes.policy_id,
          ]);

          await expect(
            uninstallTokenService.checkTokenValidityForAllPolicies()
          ).resolves.toStrictEqual({
            error: new UninstallTokenError('Failed to decrypt 1 of 2 Uninstall Token(s)'),
          });
        });

        it('returns error if none of the tokens can be decrypted', async () => {
          mockCreatePointInTimeFinderAsInternalUser([
            errorWithDecryptionSO1,
            errorWithDecryptionSO2,
          ]);

          mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt, [
            errorWithDecryptionSO1.attributes.policy_id,
            errorWithDecryptionSO2.attributes.policy_id,
          ]);

          await expect(
            uninstallTokenService.checkTokenValidityForAllPolicies()
          ).resolves.toStrictEqual({
            error: new UninstallTokenError('Failed to decrypt 2 of 2 Uninstall Token(s)'),
          });
        });

        it('throws error in case of unknown error', async () => {
          esoClientMock.createPointInTimeFinderDecryptedAsInternalUser = jest
            .fn()
            .mockRejectedValueOnce('some error');

          mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);

          await expect(
            uninstallTokenService.checkTokenValidityForAllPolicies()
          ).rejects.toThrowError('Unknown error happened while checking Uninstall Tokens validity');
        });
      });

      describe('checkTokenValidityForPolicy', () => {
        it('returns null if token is available', async () => {
          mockCreatePointInTimeFinderAsInternalUser();

          await expect(
            uninstallTokenService.checkTokenValidityForPolicy(okaySO.attributes.policy_id)
          ).resolves.toBeNull();
        });

        it('returns error if token is missing', async () => {
          mockCreatePointInTimeFinderAsInternalUser([missingTokenSO2]);

          await expect(
            uninstallTokenService.checkTokenValidityForPolicy(missingTokenSO2.attributes.policy_id)
          ).resolves.toStrictEqual({
            error: new UninstallTokenError(
              'Failed to validate Uninstall Tokens: 1 of 1 tokens are invalid'
            ),
          });
        });

        it('returns error if token decryption gives error', async () => {
          mockCreatePointInTimeFinderAsInternalUser([errorWithDecryptionSO2]);

          await expect(
            uninstallTokenService.checkTokenValidityForPolicy(
              errorWithDecryptionSO2.attributes.policy_id
            )
          ).resolves.toStrictEqual({
            error: new UninstallTokenError('Failed to decrypt 1 of 1 Uninstall Token(s)'),
          });
        });

        it('returns error on `too_many_nested_clauses` error', async () => {
          // @ts-ignore
          const responseError = new errors.ResponseError({});
          responseError.message = 'this is a too_many_nested_clauses error';

          esoClientMock.createPointInTimeFinderDecryptedAsInternalUser = jest
            .fn()
            .mockRejectedValueOnce(responseError);

          mockAgentPolicyFetchAllAgentPolicyIds(canEncrypt);

          await expect(
            uninstallTokenService.checkTokenValidityForAllPolicies()
          ).resolves.toStrictEqual({
            error: new UninstallTokenError(
              'Failed to validate uninstall tokens: `too_many_nested_clauses` error received. ' +
                'Setting/decreasing the value of `xpack.fleet.setup.uninstallTokenVerificationBatchSize` in your kibana.yml should help. ' +
                `Current value is 500.`
            ),
          });
        });

        it('throws error in case of unknown error', async () => {
          esoClientMock.createPointInTimeFinderDecryptedAsInternalUser = jest
            .fn()
            .mockRejectedValueOnce('some error');

          await expect(
            uninstallTokenService.checkTokenValidityForPolicy(
              errorWithDecryptionSO2.attributes.policy_id
            )
          ).rejects.toThrowError('Unknown error happened while checking Uninstall Tokens validity');
        });
      });
    });
  });
});
