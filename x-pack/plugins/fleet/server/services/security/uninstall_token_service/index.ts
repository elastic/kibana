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
} from '@elastic/elasticsearch/lib/api/types';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { asyncForEach } from '@kbn/std';

import type { AggregationsTermsInclude } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { GetUninstallTokensResponse } from '../../../../common/types/rest_spec/uninstall_token';

import type { UninstallToken } from '../../../../common/types/models/uninstall_token';

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
  getTokenForPolicyId(policyId: string): Promise<UninstallToken | null>;

  getTokensForPolicyIds(policyIds: string[]): Promise<UninstallToken[]>;

  findTokensForPartialPolicyId(
    searchString: string,
    page?: number,
    perPage?: number
  ): Promise<GetUninstallTokensResponse>;

  getAllTokens(page?: number, perPage?: number): Promise<GetUninstallTokensResponse>;

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
   * gets uninstall token for given policy id
   *
   * @param policyId agent policy id
   * @returns uninstall token if found
   */
  public async getTokenForPolicyId(policyId: string): Promise<UninstallToken | null> {
    return (await this.getTokensByIncludeFilter({ include: policyId })).items[0] ?? null;
  }

  /**
   * gets uninstall tokens for given policy ids
   *
   * @param policyIds agent policy ids
   * @returns array of UninstallToken objects
   */
  public async getTokensForPolicyIds(policyIds: string[]): Promise<UninstallToken[]> {
    return (await this.getTokensByIncludeFilter({ include: policyIds })).items;
  }
  /**
   * gets uninstall token for given policy id, paginated
   *
   * @param searchString a string for partial matching the policyId
   * @param page
   * @param perPage
   * @param policyId agent policy id
   * @returns GetUninstallTokensResponse
   */
  public async findTokensForPartialPolicyId(
    searchString: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<GetUninstallTokensResponse> {
    return await this.getTokensByIncludeFilter({ include: `.*${searchString}.*`, page, perPage });
  }

  /**
   * gets uninstall tokens for all policies, optionally paginated or returns all tokens
   * @param page
   * @param perPage
   * @returns GetUninstallTokensResponse
   */
  public async getAllTokens(page?: number, perPage?: number): Promise<GetUninstallTokensResponse> {
    return this.getTokensByIncludeFilter({ perPage, page });
  }

  private async getTokensByIncludeFilter({
    page = 1,
    perPage = SO_SEARCH_LIMIT,
    include,
  }: {
    include?: AggregationsTermsInclude;
    perPage?: number;
    page?: number;
  }): Promise<GetUninstallTokensResponse> {
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
                sort: [{ [`${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.created_at`]: { order: 'desc' } }],
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

    const firstItemsIndexInPage = (page - 1) * perPage;
    const isCurrentPageEmpty = firstItemsIndexInPage >= aggResults.length;
    if (isCurrentPageEmpty) {
      return { items: [], total: aggResults.length, page, perPage };
    }

    const getCreatedAt = (soBucket: UninstallTokenSOAggregationBucket) =>
      new Date(soBucket.latest.hits.hits[0]._source?.created_at ?? Date.now()).getTime();

    // sort buckets by  { created_at: 'desc' }
    // this is done with `slice()` instead of ES, because
    // 1) the query below doesn't support pagination, so we need to slice the IDs here,
    // 2) the query above doesn't support bucket sorting based on sub aggregation, see this:
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html#_ordering_by_a_sub_aggregation
    aggResults.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));

    const filter: string = aggResults
      .slice((page - 1) * perPage, page * perPage)
      .map(({ latest }) => {
        return `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.id: "${latest.hits.hits[0]._id}"`;
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

    const items: UninstallToken[] = tokenObjects
      .filter(
        ({ attributes }) => attributes.policy_id && (attributes.token || attributes.token_plain)
      )
      .map(({ attributes, created_at: createdAt }) => ({
        policy_id: attributes.policy_id,
        token: attributes.token || attributes.token_plain,
        ...(createdAt ? { created_at: createdAt } : {}),
      }));

    return { items, total: aggResults.length, page, perPage };
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
    const tokens = await this.getTokensForPolicyIds(policyIds);
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
    if (!policyIds.length) {
      return {};
    }

    const existingTokens = force
      ? {}
      : (await this.getTokensForPolicyIds(policyIds)).reduce(
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
}
