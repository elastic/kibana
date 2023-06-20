/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes, createHash } from 'crypto';

import { chunk } from 'lodash';

import type {
  SavedObjectsClientContract,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsBulkUpdateObject,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import type {
  AggregationsMultiBucketAggregateBase,
  AggregationsTopHitsAggregate,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { asyncForEach } from '@kbn/std';

import type { AggregationsTermsInclude } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { FleetError } from '../../../../common/errors';

import type {
  GetUninstallTokensForOnePolicyResponse,
  GetUninstallTokensMetadataResponse,
} from '../../../../common/types/rest_spec/uninstall_token';

import type {
  UninstallToken,
  UninstallTokenMetadata,
} from '../../../../common/types/models/uninstall_token';

import { UNINSTALL_TOKENS_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../constants';
import { appContextService } from '../../app_context';
import { agentPolicyService } from '../../agent_policy';

interface UninstallTokenSOAttributes {
  policy_id: string;
  token: string;
  token_plain: string;
}

interface UninstallTokenSOAggregationBucket {
  key: string;
  latest: AggregationsTopHitsAggregate;
}

interface UninstallTokenSOAggregation {
  by_policy_id: AggregationsMultiBucketAggregateBase<UninstallTokenSOAggregationBucket>;
}

export interface UninstallTokenServiceInterface {
  getTokenHistoryForPolicy(policyId: string): Promise<GetUninstallTokensForOnePolicyResponse>;

  searchTokenMetadata(
    searchString: string,
    page?: number,
    perPage?: number
  ): Promise<GetUninstallTokensMetadataResponse>;

  getTokenMetadataForAllPolicies(
    page?: number,
    perPage?: number
  ): Promise<GetUninstallTokensMetadataResponse>;

  getHashedTokenForPolicyId(policyId: string): Promise<string>;

  getHashedTokensForPolicyIds(policyIds?: string[]): Promise<Record<string, string>>;

  getAllHashedTokens(): Promise<Record<string, string>>;

  generateTokenForPolicyId(policyId: string, force?: boolean): Promise<string>;

  generateTokensForPolicyIds(policyIds: string[], force?: boolean): Promise<Record<string, string>>;

  generateTokensForAllPolicies(force?: boolean): Promise<Record<string, string>>;

  encryptTokens(): Promise<void>;
}

export class UninstallTokenService implements UninstallTokenServiceInterface {
  private _soClient: SavedObjectsClientContract | undefined;

  constructor(private esoClient: EncryptedSavedObjectsClient) {}

  /**
   * gets all uninstall tokens for given policy id
   *
   * @param policyId agent policy id
   * @returns uninstall tokens for policyID
   */
  public async getTokenHistoryForPolicy(
    policyId: string
  ): Promise<GetUninstallTokensForOnePolicyResponse> {
    const tokensFinder =
      await this.esoClient.createPointInTimeFinderDecryptedAsInternalUser<UninstallTokenSOAttributes>(
        {
          type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
          filter: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.policy_id: "${policyId}"`,
          sortField: 'created_at',
          sortOrder: 'desc',
        }
      );
    let decryptedTokenObjects: Array<SavedObjectsFindResult<UninstallTokenSOAttributes>> = [];

    for await (const result of tokensFinder.find()) {
      decryptedTokenObjects = result.saved_objects;
      break;
    }
    tokensFinder.close();

    const decryptedTokens = decryptedTokenObjects.map(({ created_at: createdAt, attributes }) => {
      this.assertPolicyId(attributes);
      this.assertToken(attributes);
      this.assertCreatedAt(createdAt);

      return {
        policy_id: attributes.policy_id,
        token: attributes.token || attributes.token_plain,
        created_at: createdAt,
      };
    });

    return {
      items: decryptedTokens,
      total: decryptedTokenObjects.length,
    };
  }

  /**
   * searches for uninstall token metadata using partial policyID, paginated
   *
   * @param searchString a string for partial matching the policyId
   * @param page
   * @param perPage
   * @returns Uninstall Tokens Metadata Response
   */
  public async searchTokenMetadata(
    searchString: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<GetUninstallTokensMetadataResponse> {
    return await this.getTokenMetadataByIncludeFilter({
      include: `.*${searchString}.*`,
      page,
      perPage,
    });
  }

  /**
   * gets uninstall token metadata for all policies, optionally paginated, returns all by default
   *
   * @param page
   * @param perPage
   * @returns Uninstall Tokens Metadata Response
   */
  public async getTokenMetadataForAllPolicies(
    page?: number,
    perPage?: number
  ): Promise<GetUninstallTokensMetadataResponse> {
    return this.getTokenMetadataByIncludeFilter({ perPage, page });
  }

  private async getTokenMetadataByIncludeFilter({
    page = 1,
    perPage = SO_SEARCH_LIMIT,
    include,
  }: {
    include?: AggregationsTermsInclude;
    perPage?: number;
    page?: number;
  }): Promise<GetUninstallTokensMetadataResponse> {
    const tokenObjects = await this.getTokenObjectsByIncludeFilter(include);

    const items: UninstallTokenMetadata[] = tokenObjects
      .slice((page - 1) * perPage, page * perPage)
      .map<UninstallTokenMetadata>(({ _source }) => {
        this.assertPolicyId(_source[UNINSTALL_TOKENS_SAVED_OBJECT_TYPE]);
        this.assertCreatedAt(_source.created_at);

        return {
          policy_id: _source[UNINSTALL_TOKENS_SAVED_OBJECT_TYPE].policy_id,
          created_at: _source.created_at,
        };
      });

    return { items, total: tokenObjects.length, page, perPage };
  }

  private async getDecryptedTokensForPolicyIds(policyIds: string[]): Promise<UninstallToken[]> {
    const tokenObjectHits = await this.getTokenObjectsByIncludeFilter(policyIds);

    if (tokenObjectHits.length === 0) {
      return [];
    }

    const filter: string = tokenObjectHits
      .map(({ _id }) => {
        return `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.id: "${_id}"`;
      })
      .join(' or ');

    const tokensFinder =
      await this.esoClient.createPointInTimeFinderDecryptedAsInternalUser<UninstallTokenSOAttributes>(
        {
          type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
          perPage: SO_SEARCH_LIMIT,
          filter,
        }
      );
    let tokenObjects: Array<SavedObjectsFindResult<UninstallTokenSOAttributes>> = [];

    for await (const result of tokensFinder.find()) {
      tokenObjects = result.saved_objects;
      break;
    }
    tokensFinder.close();

    const uninstallTokens: UninstallToken[] = tokenObjects.map(
      ({ attributes, created_at: createdAt }) => {
        this.assertPolicyId(attributes);
        this.assertToken(attributes);
        this.assertCreatedAt(createdAt);

        return {
          policy_id: attributes.policy_id,
          token: attributes.token || attributes.token_plain,
          created_at: createdAt,
        };
      }
    );

    return uninstallTokens;
  }

  private async getTokenObjectsByIncludeFilter(
    include?: AggregationsTermsInclude
  ): Promise<Array<SearchHit<any>>> {
    const bucketSize = 10000;

    const query: SavedObjectsCreatePointInTimeFinderOptions = {
      type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
      perPage: 0,
      aggs: {
        by_policy_id: {
          terms: {
            field: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.policy_id`,
            size: bucketSize,
            include,
          },
          aggs: {
            latest: {
              top_hits: {
                size: 1,
                sort: [{ created_at: { order: 'desc' } }],
                _source: [`${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.policy_id`, 'created_at'],
              },
            },
          },
        },
      },
    };

    // encrypted saved objects doesn't decrypt aggregation values so we get
    // the ids first from saved objects to use with encrypted saved objects
    const idFinder = this.soClient.createPointInTimeFinder<
      UninstallTokenSOAttributes,
      UninstallTokenSOAggregation
    >(query);

    let aggResults: UninstallTokenSOAggregationBucket[] = [];
    for await (const result of idFinder.find()) {
      if (
        !result?.aggregations?.by_policy_id.buckets ||
        !Array.isArray(result?.aggregations?.by_policy_id.buckets)
      ) {
        break;
      }
      aggResults = result.aggregations.by_policy_id.buckets;
      break;
    }

    const getCreatedAt = (soBucket: UninstallTokenSOAggregationBucket) =>
      new Date(soBucket.latest.hits.hits[0]._source?.created_at ?? Date.now()).getTime();

    // sorting and paginating buckets is done here instead of ES,
    // because SO query doesn't support `bucket_sort`
    aggResults.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));

    return aggResults.map((bucket) => bucket.latest.hits.hits[0]);
  }

  /**
   * get hashed uninstall token for given policy id
   *
   * @param policyId agent policy id
   * @returns hashedToken
   */
  public async getHashedTokenForPolicyId(policyId: string): Promise<string> {
    return (await this.getHashedTokensForPolicyIds([policyId]))[policyId];
  }

  /**
   * get hashed uninstall tokens for given policy ids
   *
   * @param policyIds agent policy ids
   * @returns Record<policyId, hashedToken>
   */
  public async getHashedTokensForPolicyIds(policyIds: string[]): Promise<Record<string, string>> {
    const tokens = await this.getDecryptedTokensForPolicyIds(policyIds);
    return tokens.reduce((acc, { policy_id: policyId, token }) => {
      if (policyId && token) {
        acc[policyId] = this.hashToken(token);
      }
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * get hashed uninstall token for all policies
   *
   * @returns Record<policyId, hashedToken>
   */
  public async getAllHashedTokens(): Promise<Record<string, string>> {
    const policyIds = await this.getAllPolicyIds();
    return this.getHashedTokensForPolicyIds(policyIds);
  }

  /**
   * generate uninstall token for given policy id
   * will not create a new token if one already exists for a given policy unless force: true is used
   *
   * @param policyId agent policy id
   * @param force generate a new token even if one already exists
   * @returns hashedToken
   */
  public async generateTokenForPolicyId(policyId: string, force: boolean = false): Promise<string> {
    return (await this.generateTokensForPolicyIds([policyId], force))[policyId];
  }

  /**
   * generate uninstall tokens for given policy ids
   * will not create a new token if one already exists for a given policy unless force: true is used
   *
   * @param policyIds agent policy ids
   * @param force generate a new token even if one already exists
   * @returns Record<policyId, hashedToken>
   */
  public async generateTokensForPolicyIds(
    policyIds: string[],
    force: boolean = false
  ): Promise<Record<string, string>> {
    const { agentTamperProtectionEnabled } = appContextService.getExperimentalFeatures();

    if (!agentTamperProtectionEnabled || !policyIds.length) {
      return {};
    }

    const existingTokens = force
      ? {}
      : (await this.getDecryptedTokensForPolicyIds(policyIds)).reduce(
          (acc, { policy_id: policyId, token }) => {
            acc[policyId] = token;
            return acc;
          },
          {} as Record<string, string>
        );
    const missingTokenPolicyIds = force
      ? policyIds
      : policyIds.filter((policyId) => !existingTokens[policyId]);

    const newTokensMap = missingTokenPolicyIds.reduce((acc, policyId) => {
      const token = this.generateToken();
      return {
        ...acc,
        [policyId]: token,
      };
    }, {} as Record<string, string>);

    await this.persistTokens(missingTokenPolicyIds, newTokensMap);
    if (force) {
      const config = appContextService.getConfig();
      const batchSize = config?.setup?.agentPolicySchemaUpgradeBatchSize ?? 100;
      asyncForEach(
        chunk(policyIds, batchSize),
        async (policyIdsBatch) =>
          await agentPolicyService.deployPolicies(this.soClient, policyIdsBatch)
      );
    }

    const tokensMap = {
      ...existingTokens,
      ...newTokensMap,
    };

    return Object.entries(tokensMap).reduce((acc, [policyId, token]) => {
      acc[policyId] = this.hashToken(token);
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * generate uninstall tokens all policies
   * will not create a new token if one already exists for a given policy unless force: true is used
   *
   * @param force generate a new token even if one already exists
   * @returns Record<policyId, hashedToken>
   */
  public async generateTokensForAllPolicies(
    force: boolean = false
  ): Promise<Record<string, string>> {
    const policyIds = await this.getAllPolicyIds();
    return this.generateTokensForPolicyIds(policyIds, force);
  }

  /**
   * if encryption is available, checks for any plain text uninstall tokens and encrypts them
   */
  public async encryptTokens(): Promise<void> {
    if (!this.isEncryptionAvailable) {
      return;
    }

    const { saved_objects: unencryptedTokenObjects } =
      await this.soClient.find<UninstallTokenSOAttributes>({
        type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
        filter: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.token_plain:* AND (NOT ${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.token_plain: "")`,
      });

    if (!unencryptedTokenObjects.length) {
      return;
    }

    const bulkUpdateObjects: Array<SavedObjectsBulkUpdateObject<UninstallTokenSOAttributes>> = [];
    for (const unencryptedTokenObject of unencryptedTokenObjects) {
      bulkUpdateObjects.push({
        ...unencryptedTokenObject,
        attributes: {
          ...unencryptedTokenObject.attributes,
          token: unencryptedTokenObject.attributes.token_plain,
          token_plain: '',
        },
      });
    }

    await this.soClient.bulkUpdate(bulkUpdateObjects);
  }

  private async getPolicyIdsBatch(
    batchSize: number = SO_SEARCH_LIMIT,
    page: number = 1
  ): Promise<string[]> {
    return (
      await agentPolicyService.list(this.soClient, { page, perPage: batchSize, fields: ['id'] })
    ).items.map((policy) => policy.id);
  }

  private async getAllPolicyIds(): Promise<string[]> {
    const batchSize = SO_SEARCH_LIMIT;
    let policyIdsBatch = await this.getPolicyIdsBatch(batchSize);
    let policyIds = policyIdsBatch;
    let page = 2;

    while (policyIdsBatch.length === batchSize) {
      policyIdsBatch = await this.getPolicyIdsBatch(batchSize, page);
      policyIds = [...policyIds, ...policyIdsBatch];
      page++;
    }

    return policyIds;
  }

  private async persistTokens(
    policyIds: string[],
    tokensMap: Record<string, string>
  ): Promise<void> {
    if (!policyIds.length) {
      return;
    }

    const config = appContextService.getConfig();
    const batchSize = config?.setup?.agentPolicySchemaUpgradeBatchSize ?? 100;

    await asyncForEach(chunk(policyIds, batchSize), async (policyIdsBatch) => {
      await this.soClient.bulkCreate<Partial<UninstallTokenSOAttributes>>(
        policyIdsBatch.map((policyId) => ({
          type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
          attributes: this.isEncryptionAvailable
            ? {
                policy_id: policyId,
                token: tokensMap[policyId],
              }
            : {
                policy_id: policyId,
                token_plain: tokensMap[policyId],
              },
        }))
      );
    });
  }

  private generateToken(): string {
    return randomBytes(16).toString('hex');
  }

  private hashToken(token: string): string {
    if (!token) {
      return '';
    }
    const hash = createHash('sha256');
    hash.update(token);
    return hash.digest('base64');
  }

  private get soClient() {
    if (this._soClient) {
      return this._soClient;
    }

    const fakeRequest = {
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: { href: {} },
      raw: { req: { url: '/' } },
    } as unknown as KibanaRequest;

    this._soClient = appContextService.getSavedObjects().getScopedClient(fakeRequest, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes: [UNINSTALL_TOKENS_SAVED_OBJECT_TYPE],
    });

    return this._soClient;
  }

  private get isEncryptionAvailable(): boolean {
    return appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt ?? false;
  }

  private assertCreatedAt(createdAt: string | undefined): asserts createdAt is string {
    if (!createdAt) {
      throw new FleetError('Uninstall Token is missing creation date!');
    }
  }

  private assertToken(attributes: UninstallTokenSOAttributes | undefined) {
    if (!attributes?.token && !attributes?.token_plain) {
      throw new FleetError('Uninstall Token is missing token! ');
    }
  }

  private assertPolicyId(attributes: UninstallTokenSOAttributes | undefined) {
    if (!attributes?.policy_id) {
      throw new FleetError('Uninstall Token is missing policy ID!');
    }
  }
}
