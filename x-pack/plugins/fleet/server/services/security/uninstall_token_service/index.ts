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
  getTokenForPolicyId(policyId: string): Promise<string>;

  getTokensForPolicyIds(policyIds: string[]): Promise<Record<string, string>>;

  getAllTokens(): Promise<Record<string, string>>;

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
   * @returns token
   */
  public async getTokenForPolicyId(policyId: string): Promise<string> {
    return (await this.getTokensForPolicyIds([policyId]))[policyId];
  }

  /**
   * gets uninstall tokens for given policy ids
   *
   * @param policyIds agent policy ids
   * @returns Record<policyId, token>
   */
  public async getTokensForPolicyIds(policyIds: string[]): Promise<Record<string, string>> {
    let filter = policyIds
      .map((policyId) => `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.policy_id: ${policyId}`)
      .join(' or ');
    const bucketSize = 10000;
    const query: SavedObjectsCreatePointInTimeFinderOptions = {
      type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
      perPage: 0,
      filter,
      aggs: {
        by_policy_id: {
          terms: {
            field: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.policy_id`,
            size: bucketSize,
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

    filter = aggResults
      .reduce((acc, { latest }) => {
        const id = latest?.hits?.hits?.at(0)?._id;
        if (!id) return acc;
        const filterStr = `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.id: "${id}"`;
        acc.push(filterStr);
        return acc;
      }, [] as string[])
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
      tokenObjects = [...tokenObjects, ...result.saved_objects];
    }
    tokensFinder.close();

    const tokensMap = tokenObjects.reduce((acc, { attributes }) => {
      const policyId = attributes.policy_id;
      const token = attributes.token || attributes.token_plain;
      if (!policyId || !token) {
        return acc;
      }

      acc[policyId] = token;
      return acc;
    }, {} as Record<string, string>);

    return tokensMap;
  }

  /**
   * gets uninstall tokens for all policies
   *
   * @returns Record<policyId, token>
   */
  public async getAllTokens(): Promise<Record<string, string>> {
    const policyIds = await this.getAllPolicyIds();
    return this.getTokensForPolicyIds(policyIds);
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
    const tokensMap = await this.getTokensForPolicyIds(policyIds);
    return Object.entries(tokensMap).reduce((acc, [policyId, token]) => {
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

    const existingTokens = force ? {} : await this.getTokensForPolicyIds(policyIds);
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

    asyncForEach(chunk(policyIds, batchSize), async (policyIdsBatch) => {
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
