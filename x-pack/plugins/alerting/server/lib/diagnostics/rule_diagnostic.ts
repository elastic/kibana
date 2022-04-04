/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Request } from '@hapi/hapi';
import { compact } from 'lodash';
import { asyncForEach } from '@kbn/std';
import type { DiagnosticResult, RuleTypeParams } from '../../types';
import { addSpaceIdToPath } from '../../../../spaces/server';
import {
  KibanaRequest,
  IBasePath,
  ElasticsearchServiceStart,
  ElasticsearchClient,
} from '../../../../../../src/core/server';
import type { CreateAPIKeyResult } from '../../rules_client/rules_client';

export type CustomDiagnostic<Params extends RuleTypeParams> = (params: Params) => DiagnosticResult;

export interface Diagnostics<Params extends RuleTypeParams> {
  // This function should return the indices that the rule
  // expects to operate over
  getIndices?: (params: Params) => string;

  // This function should return the fields that the rule expects to group by
  getAggregatedFields?: (params: Params) => string[];

  // This allows rule type to store custom diagnostic functions.
  // Each function should take the rule params as input and return
  // a user-friendly diagnostic name message.
  custom?: Array<CustomDiagnostic<Params>>;
}

const DIAGNOSTICS_DISABLED = {
  name: 'Diagnostics disabled',
  message: 'Rule diagnostics have not been enabled for this rule type',
};

const NO_INDICES_SPECIFIED = {
  name: 'No indices specified',
  message: 'Unable to determine which indices to use for diagnostic',
};

const NO_USERNAME = {
  name: 'Invalid username',
  message: 'Unable to diagnose rule without username.',
};

interface ConstructorOpts {
  basePathService: IBasePath;
  spaceId?: string;
  elasticsearch: ElasticsearchServiceStart;
  createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
}

interface DiagnoseOpts<Params extends RuleTypeParams> {
  params: Params;
  diagnostics?: Diagnostics<Params>;
  ruleTypeId: string;
  username: string | null;
}

interface DiagnoseIndicesOpts<Params extends RuleTypeParams> {
  params: Params;
  indices: string;
  username: string;
  fields: string;
  esClient: ElasticsearchClient;
}

function getIndexAccessError(index: string, username: string, err: Error): DiagnosticResult {
  return {
    name: 'Index access error',
    message: `Unable to query index ${index} as user ${username} - ${err.message}`,
  };
}
export class RuleDiagnostic {
  private readonly basePathService: IBasePath;
  private readonly spaceId: string;
  private readonly createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
  private readonly elasticsearch: ElasticsearchServiceStart;

  constructor({ basePathService, spaceId, createAPIKey, elasticsearch }: ConstructorOpts) {
    this.basePathService = basePathService;
    this.createAPIKey = createAPIKey;
    this.spaceId = spaceId ?? 'default';
    this.elasticsearch = elasticsearch;
  }

  public async diagnose<Params extends RuleTypeParams>({
    params,
    diagnostics,
    ruleTypeId,
    username,
  }: DiagnoseOpts<Params>) {
    if (!username) {
      return [NO_USERNAME];
    }

    const results: DiagnosticResult[] = [];
    if (diagnostics) {
      const fakeRequest = await this.createApiKeyAndFakeRequest(ruleTypeId);
      if (diagnostics.getIndices) {
        const scopedClusterClient = this.elasticsearch.client.asScoped(fakeRequest);
        const esClient = scopedClusterClient.asCurrentUser;

        const indices = diagnostics.getIndices(params);

        let fields: string = '*';
        if (diagnostics.getAggregatedFields) {
          const aggFields: string[] = diagnostics.getAggregatedFields(params);
          if (aggFields.length > 0) {
            fields = aggFields.join(',');
          }
        }

        if (indices && indices.length > 0) {
          const indexResults = await this.diagnoseIndices({
            indices,
            username,
            params,
            esClient,
            fields,
          });

          if (indexResults) results.push(...indexResults);
        } else {
          results.push(NO_INDICES_SPECIFIED);
        }
      }
    } else {
      results.push(DIAGNOSTICS_DISABLED);
    }

    return results;
  }

  private async createApiKeyAndFakeRequest(ruleTypeId: string) {
    // Create an API key and fake request for searching against indices
    const apiKey = await this.createAPIKey(`Alerting diagnostic: ${ruleTypeId}`);
    const apiKeyValue = this.apiKeyAsString(apiKey);
    return this.getFakeKibanaRequest(this.spaceId, apiKeyValue);
  }

  private async diagnoseIndices<Params extends RuleTypeParams>({
    indices,
    username,
    fields,
    params,
    esClient,
  }: DiagnoseIndicesOpts<Params>): Promise<DiagnosticResult[] | null> {
    // test each index separately
    const indexes = indices.split(',');

    // test ability to access index with current role
    const promises = await Promise.allSettled(
      indexes.map(async (index: string) => {
        await esClient.search({
          index,
          body: {
            size: 0,
            query: {
              match_all: {},
            },
          },
        });
      })
    );

    const rejectedResults = [];
    const successfulIndices = [];
    for (let ndx = 0; ndx < indexes.length; ++ndx) {
      if (promises[ndx].status === 'rejected') {
        rejectedResults.push(
          getIndexAccessError(
            indexes[ndx],
            username,
            (promises[ndx] as PromiseRejectedResult).reason
          )
        );
      } else {
        successfulIndices.push(indexes[ndx]);
      }
    }

    await this.diagnoseIndexFields({
      indices: successfulIndices.join(','),
      fields,
      esClient,
      username,
      params,
    });

    return rejectedResults.length > 0 ? rejectedResults : null;
  }

  private async diagnoseIndexFields<Params extends RuleTypeParams>({
    indices,
    fields,
    username,
    esClient,
  }: DiagnoseIndicesOpts<Params>): Promise<DiagnosticResult[] | null> {
    console.log(`fields ${fields}`);
    const body = await esClient.fieldCaps({ index: indices, fields });

    console.log(JSON.stringify(body));

    return null;
  }

  private apiKeyAsString(apiKey: CreateAPIKeyResult | null): string | null {
    return apiKey && apiKey.apiKeysEnabled
      ? Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64')
      : null;
  }

  private getFakeKibanaRequest(spaceId: string, apiKey: string | null) {
    const requestHeaders: Record<string, string> = {};

    if (apiKey) {
      requestHeaders.authorization = `ApiKey ${apiKey}`;
    }

    const path = addSpaceIdToPath('/', spaceId);

    const fakeRequest = KibanaRequest.from({
      headers: requestHeaders,
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    } as unknown as Request);

    this.basePathService.set(fakeRequest, path);

    return fakeRequest;
  }
}
