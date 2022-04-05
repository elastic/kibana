/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Request } from '@hapi/hapi';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  DiagnosticResult,
  DiagnoseOutput,
  RuleTypeParams,
  IntervalSchedule,
} from '../../types';
import { addSpaceIdToPath } from '../../../../spaces/server';
import {
  KibanaRequest,
  IBasePath,
  ElasticsearchServiceStart,
  ElasticsearchClient,
  IScopedClusterClient,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
} from '../../../../../../src/core/server';
import type { CreateAPIKeyResult } from '../../rules_client/rules_client';
import { createWrappedScopedClusterClientFactory } from '../wrap_scoped_cluster_client';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { validateRuleTypeParams } from '../validate_rule_type_params';
import { alertInstanceFactoryStub } from './alert_instance_factory_stub';
import { PluginStart as DataPluginStart } from '../../../../../../src/plugins/data/server';

export type CustomDiagnostic<Params extends RuleTypeParams> = (params: Params) => DiagnosticResult;

const CARDINALITY_OVERALL_THRESHOLD = 10000;
type CardinalityAgg = estypes.AggregationsAggregateBase & {
  [property: string]: estypes.AggregationsCardinalityAggregate;
};
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

const DIAGNOSTICS_DISABLED: DiagnosticResult = {
  type: 'warning',
  name: 'Diagnostics disabled',
  message: 'Rule diagnostics have not been enabled for this rule type',
};

const NO_INDICES_SPECIFIED: DiagnosticResult = {
  type: 'error',
  name: 'No indices specified',
  message: 'Unable to determine which indices to use for diagnostic',
};

const NO_USERNAME: DiagnosticResult = {
  type: 'error',
  name: 'Invalid username',
  message: 'Unable to diagnose rule without username.',
};

interface ConstructorOpts {
  basePathService: IBasePath;
  spaceId?: string;
  elasticsearch: ElasticsearchServiceStart;
  savedObjects: SavedObjectsServiceStart;
  data: DataPluginStart;
  uiSettings: UiSettingsServiceStart;
  createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
}

interface DiagnoseOpts<Params extends RuleTypeParams> {
  params: Params;
  schedule: IntervalSchedule;
  ruleType: UntypedNormalizedRuleType;
  username: string | null;
}

interface DiagnoseIndicesOpts<Params extends RuleTypeParams> {
  params: Params;
  indices: string;
  username: string;
  fields: string;
  esClient: ElasticsearchClient;
}

interface DiagnoseExecutorOpts<Params extends RuleTypeParams> {
  ruleType: UntypedNormalizedRuleType;
  scopedClusterClient: IScopedClusterClient;
  request: KibanaRequest;
  params: Params;
}

function getIndexAccessError(index: string, username: string, err: Error): DiagnosticResult {
  return {
    type: 'error',
    name: 'Index access error',
    message: `Unable to query index ${index} as user ${username} - ${err.message}`,
  };
}

function getIndexExistsError(index: string): DiagnosticResult {
  return {
    type: 'warning',
    name: 'Index exists error',
    message: `Index ${index} does not exist`,
  };
}

function getInvalidRuleParamError(err: Error): DiagnosticResult {
  return {
    type: 'error',
    name: 'Invalid rule params',
    message: err.message,
  };
}

function getIndexCardinalityError(
  index: string,
  field: string,
  cardinality: number,
  range: string
): DiagnosticResult {
  return {
    type: 'warning',
    name: 'Index cardinality error',
    message: `"${field}" in index ${index} has a cardinality of ${cardinality} ${range}. Using this in your rule may lead to poor performance.`,
  };
}

export class RuleDiagnostic {
  private readonly basePathService: IBasePath;
  private readonly spaceId: string;
  private readonly createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly savedObjects: SavedObjectsServiceStart;
  private readonly data: DataPluginStart;
  private readonly uiSettings: UiSettingsServiceStart;

  constructor({
    basePathService,
    spaceId,
    createAPIKey,
    elasticsearch,
    uiSettings,
    data,
    savedObjects,
  }: ConstructorOpts) {
    this.basePathService = basePathService;
    this.createAPIKey = createAPIKey;
    this.spaceId = spaceId ?? 'default';
    this.elasticsearch = elasticsearch;
    this.savedObjects = savedObjects;
    this.data = data;
    this.uiSettings = uiSettings;
  }

  public async diagnose<Params extends RuleTypeParams>({
    schedule,
    params,
    ruleType,
    username,
  }: DiagnoseOpts<Params>): Promise<DiagnoseOutput> {
    let requestAndResponses = {
      requests: [],
      responses: [],
    };

    if (!username) {
      return {
        requestAndResponses,
        errorsAndWarnings: [NO_USERNAME],
      };
    }

    // Validate params
    try {
      validateRuleTypeParams(params, ruleType.validate?.params);
    } catch (err) {
      return {
        requestAndResponses,
        errorsAndWarnings: [getInvalidRuleParamError(err)],
      };
    }

    if (!ruleType.diagnostics) {
      return {
        requestAndResponses,
        errorsAndWarnings: [DIAGNOSTICS_DISABLED],
      };
    }

    const results: DiagnosticResult[] = [];

    const fakeRequest = await this.createApiKeyAndFakeRequest(ruleType.id);
    if (ruleType.diagnostics.getIndices) {
      const indices = ruleType.diagnostics.getIndices(params);

      // Unable to determine indices to run rule over
      if (!indices || indices.length === 0) {
        return {
          requestAndResponses,
          errorsAndWarnings: [NO_INDICES_SPECIFIED],
        };
      }

      const scopedClusterClient = this.elasticsearch.client.asScoped(fakeRequest);
      const wrappedScopedClusterClient = createWrappedScopedClusterClientFactory({
        scopedClusterClient,
        rule: {
          name: 'preview',
          alertTypeId: ruleType.id,
          id: 'preview',
          spaceId: this.spaceId,
        },
        abortController: new AbortController(),
      });
      const wrappedClusterClient = wrappedScopedClusterClient.client();

      let fields: string = '*';
      if (ruleType.diagnostics.getAggregatedFields) {
        const aggFields: string[] = ruleType.diagnostics.getAggregatedFields(params);
        if (aggFields.length > 0) {
          fields = aggFields.join(',');
        }
      }

      const indexResults = await this.diagnoseIndices({
        indices,
        username,
        params,
        esClient: scopedClusterClient.asCurrentUser,
        fields,
      });

      if (indexResults) results.push(...indexResults);

      await this.diagnoseExecution({
        ruleType,
        params,
        scopedClusterClient: wrappedClusterClient,
        request: fakeRequest,
      });

      requestAndResponses = wrappedScopedClusterClient.getRequestAndResponse();
    }

    return {
      requestAndResponses,
      errorsAndWarnings: results,
    };
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
    const rejectedResults = [];

    // test each index separately
    const indexes = indices.split(',');

    // test whether indices exist
    for (const index of indexes) {
      const exists = await esClient.indices.exists({
        index,
      });

      if (!exists) {
        rejectedResults.push(getIndexExistsError(index));
      }
    }

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

    const indexCardinalityResult = await this.diagnoseIndexFields({
      indices: successfulIndices.join(','),
      fields,
      esClient,
      username,
      params,
    });
    if (indexCardinalityResult) {
      rejectedResults.push(...indexCardinalityResult);
    }

    return rejectedResults.length > 0 ? rejectedResults : null;
  }

  private async diagnoseIndexFields<Params extends RuleTypeParams>({
    indices,
    fields,
    esClient,
  }: DiagnoseIndicesOpts<Params>): Promise<DiagnosticResult[] | null> {
    const body = await esClient.fieldCaps({ index: indices, fields });

    const indexFields = body.fields ?? {};

    const aggs = Object.keys(indexFields).reduce((acc, field) => {
      const fieldCapData = indexFields[field];
      const path = Object.keys(fieldCapData)[0];
      const isAggregatable = indexFields[field][path].aggregatable;

      return isAggregatable
        ? {
            ...acc,
            [field]: {
              cardinality: {
                field,
              },
            },
          }
        : acc;
    }, {});
    const cardinalityResults = await esClient.search({
      index: indices,
      body: {
        size: 0,
        query: {
          match_all: {},
        },
        aggs,
      },
    });

    const cardinalities = cardinalityResults.aggregations as CardinalityAgg;

    const results: DiagnosticResult[] = [];
    if (cardinalities) {
      Object.keys(cardinalities).forEach((f) => {
        const cardinality = cardinalities[f].value;
        if (cardinality > CARDINALITY_OVERALL_THRESHOLD) {
          results.push(getIndexCardinalityError(indices, f, cardinality, 'over all time'));
        }
      });
    }

    return results.length > 0 ? results : null;
  }

  private async diagnoseExecution<Params extends RuleTypeParams>({
    ruleType,
    params,
    scopedClusterClient,
    request,
  }: DiagnoseExecutorOpts<Params>) {
    const savedObjectsClient = this.savedObjects.getScopedClient(request, {
      includedHiddenTypes: ['alert', 'action'],
    });
    const searchSourceClient = this.data.search.searchSource.asScoped(request);
    const uiSettingsClient = this.uiSettings.asScopedToClient(savedObjectsClient);

    await ruleType.executor({
      alertId: 'preview',
      executionId: 'preview',
      startedAt: new Date(),
      previousStartedAt: null,
      services: {
        shouldWriteAlerts: () => true,
        shouldStopExecution: () => false,
        alertFactory: {
          create: alertInstanceFactoryStub,
          done: () => ({ getRecoveredAlerts: () => [] }),
        },
        savedObjectsClient,
        scopedClusterClient,
        searchSourceClient,
        uiSettingsClient,
      },
      params,
      state: {},
      rule: {
        name: 'preview',
        tags: [],
        consumer: '',
        producer: '',
        ruleTypeId: ruleType.id,
        ruleTypeName: ruleType.name,
        enabled: true,
        schedule: {
          interval: '1h',
        },
        actions: [],
        createdBy: null,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        throttle: null,
        notifyWhen: 'onActionGroupChange',
      },
      spaceId: this.spaceId,
      name: 'preview',
      tags: [],
      createdBy: null,
      updatedBy: null,
    });
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
