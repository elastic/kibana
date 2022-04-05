/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Request } from '@hapi/hapi';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  DiagnosticResult,
  DiagnoseOutput,
  RuleTypeParams,
  IntervalSchedule,
  RawRule,
  parseDuration,
  Rule,
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
import { EncryptedSavedObjectsClient } from '../../../../encrypted_saved_objects/server';

export type CustomDiagnostic<Params extends RuleTypeParams> = (
  params: Params
) => DiagnosticResult[];

const CARDINALITY_OVERALL_THRESHOLD = 10000;
const ONE_MINUTE_IN_MILLISSECONDS = 60000;
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

const NO_INDICES_SPECIFIED: DiagnosticResult = {
  type: 'error',
  name: 'No indices specified',
  message: 'Unable to determine which indices to use for diagnostic',
};

interface ConstructorOpts {
  basePathService: IBasePath;
  spaceId?: string;
  namespace?: string;
  elasticsearch: ElasticsearchServiceStart;
  savedObjects: SavedObjectsServiceStart;
  data: DataPluginStart;
  uiSettings: UiSettingsServiceStart;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
}

interface DiagnoseOpts<Params extends RuleTypeParams> {
  rule?: Rule;
  apiKey?: string | null;
  params: Params;
  schedule: IntervalSchedule;
  ruleType: UntypedNormalizedRuleType;
  username: string | null;
}

interface DiagnoseExecutorOpts<Params extends RuleTypeParams> {
  ruleType: UntypedNormalizedRuleType;
  scopedClusterClient: IScopedClusterClient;
  request: KibanaRequest;
  params: Params;
}

function getIndexAccessError(index: string, username: string | null, err: Error): DiagnosticResult {
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

function getDecryptionError(err: Error): DiagnosticResult {
  return {
    type: 'error',
    name: 'Unable to decrypt',
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
  private readonly namespace?: string;
  private readonly spaceId: string;
  private readonly createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly savedObjects: SavedObjectsServiceStart;
  private readonly data: DataPluginStart;
  private readonly uiSettings: UiSettingsServiceStart;
  private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient;

  private fakeRequest: KibanaRequest | null;
  private scopedClusterClient: IScopedClusterClient | null;

  constructor({
    basePathService,
    spaceId,
    namespace,
    createAPIKey,
    elasticsearch,
    uiSettings,
    data,
    savedObjects,
    encryptedSavedObjectsClient,
  }: ConstructorOpts) {
    this.basePathService = basePathService;
    this.createAPIKey = createAPIKey;
    this.spaceId = spaceId ?? 'default';
    this.namespace = namespace;
    this.elasticsearch = elasticsearch;
    this.savedObjects = savedObjects;
    this.data = data;
    this.uiSettings = uiSettings;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;

    this.fakeRequest = null;
    this.scopedClusterClient = null;
  }

  public async diagnose<Params extends RuleTypeParams>({
    rule,
    apiKey,
    schedule,
    params,
    ruleType,
    username,
  }: DiagnoseOpts<Params>): Promise<DiagnoseOutput> {
    const errorsAndWarnings: DiagnosticResult[] = [];

    // Framework diagnostics
    const frameworkDiagnosticResults = await this.runFrameworkDiagnostics({
      params,
      schedule,
      ruleType,
      ruleId: rule?.id,
    });
    errorsAndWarnings.push(...frameworkDiagnosticResults);

    // Custom diagnostics if defined
    const customDiagnosticResults = await this.runCustomDiagnostics({
      params,
      apiKey,
      ruleType,
      username,
    });
    errorsAndWarnings.push(...customDiagnosticResults);

    // Sample executor results
    const executorResults = await this.runExecutor({
      ruleType,
      params,
      apiKey,
    });
    errorsAndWarnings.push(...executorResults.errorsAndWarnings);

    // Preview results

    return { errorsAndWarnings, requestAndResponses: executorResults.requestAndResponses };
  }

  /**
   * These are diagnostics that can be performed at a framework leve
   * They do not require opt-in by the rule type
   */
  public async runFrameworkDiagnostics<Params extends RuleTypeParams>({
    params,
    schedule,
    ruleType,
    ruleId,
  }: {
    params: Params;
    schedule: IntervalSchedule;
    ruleType: UntypedNormalizedRuleType;
    ruleId?: string;
  }) {
    const results: DiagnosticResult[] = [];

    // Validate rule params
    try {
      validateRuleTypeParams(params, ruleType.validate?.params);
    } catch (err) {
      results.push(getInvalidRuleParamError(err));
    }

    // If we're given a rule id for an existing rule, try to load the decrypted rule
    if (ruleId) {
      try {
        await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
          'alert',
          ruleId,
          {
            namespace: this.namespace,
          }
        );
      } catch (err) {
        results.push(getDecryptionError(err));
      }
    }

    // If we're given a schedule, check that it is not too frequent
    if (schedule && schedule.interval) {
      if (parseDuration(schedule.interval) < ONE_MINUTE_IN_MILLISSECONDS) {
        results.push({
          type: 'warning',
          name: 'Check interval too small',
          message: 'Running rules at this check interval may affect alerting performance.',
        });
      }
    }

    return results;
  }

  /**
   * These are the diagnostics that can be performed if the rule type
   * opts into some of the diagnostic hooks provided or defines their own
   * custom diagnostic functions
   */
  public async runCustomDiagnostics<Params extends RuleTypeParams>({
    params,
    apiKey,
    ruleType,
    username,
  }: {
    params: Params;
    apiKey?: string | null;
    ruleType: UntypedNormalizedRuleType;
    username: string | null;
  }) {
    const results: DiagnosticResult[] = [];
    if (!ruleType.diagnostics) {
      return results;
    }

    if (!this.fakeRequest) {
      this.fakeRequest = await this.createFakeRequest(ruleType.id, apiKey);
    }

    if (ruleType.diagnostics.getIndices) {
      const indices = ruleType.diagnostics.getIndices(params);

      if (!indices || indices.length === 0) {
        // Unable to determine indices to run rule over
        results.push(NO_INDICES_SPECIFIED);
      } else {
        if (!this.scopedClusterClient) {
          this.scopedClusterClient = this.elasticsearch.client.asScoped(this.fakeRequest);

          let fields: string = '*';
          if (ruleType.diagnostics.getAggregatedFields) {
            const aggFields: string[] = ruleType.diagnostics.getAggregatedFields(params);
            if (aggFields.length > 0) {
              fields = aggFields.join(',');
            }
          }

          const diagnoseIndicesResults = await this.diagnoseIndices({
            indices,
            username,
            esClient: this.scopedClusterClient.asCurrentUser,
            fields,
          });
          results.push(...diagnoseIndicesResults);
        }
      }
    }

    if (ruleType.diagnostics.custom) {
      for (const customDiagnostic of ruleType.diagnostics.custom) {
        results.push(...customDiagnostic(params));
      }
    }
    return results;
  }

  public async runExecutor<Params extends RuleTypeParams>({
    ruleType,
    params,
    apiKey,
  }: {
    params: Params;
    apiKey?: string | null;
    ruleType: UntypedNormalizedRuleType;
  }) {
    const results: DiagnosticResult[] = [];
    if (!this.fakeRequest) {
      this.fakeRequest = await this.createFakeRequest(ruleType.id, apiKey);
    }

    if (!this.scopedClusterClient) {
      this.scopedClusterClient = this.elasticsearch.client.asScoped(this.fakeRequest);
    }

    const wrappedScopedClusterClient = createWrappedScopedClusterClientFactory({
      scopedClusterClient: this.scopedClusterClient,
      rule: {
        name: 'preview',
        alertTypeId: ruleType.id,
        id: 'preview',
        spaceId: this.spaceId,
      },
      abortController: new AbortController(),
    });
    const wrappedClusterClient = wrappedScopedClusterClient.client();

    const executionResults = await this.diagnoseExecution({
      ruleType,
      params,
      scopedClusterClient: wrappedClusterClient,
      request: this.fakeRequest,
    });
    results.push(...executionResults);

    const requestAndResponses = wrappedScopedClusterClient.getRequestAndResponse();
    return { errorsAndWarnings: results, requestAndResponses };
  }

  private async createFakeRequest(ruleTypeId: string, apiKey?: string | null) {
    let apiKeyToUse: string | null;
    if (!apiKey) {
      // Create an API key and fake request for searching against indices
      const newApiKey = await this.createAPIKey(`Alerting diagnostic: ${ruleTypeId}`);
      apiKeyToUse = this.apiKeyAsString(newApiKey);
    } else {
      apiKeyToUse = apiKey;
    }

    return this.getFakeKibanaRequest(this.spaceId, apiKeyToUse);
  }

  /**
   * Tries to identify potential issues with the indices configured for the rule
   * Examples include missing indices and insufficient privileges.
   */
  private async diagnoseIndices({
    indices,
    username,
    fields,
    esClient,
  }: {
    indices: string;
    username: string | null;
    fields: string;
    esClient: ElasticsearchClient;
  }): Promise<DiagnosticResult[]> {
    const results = [];

    // test each index separately
    const indexes = indices.split(',');

    // test whether indices exist
    for (const index of indexes) {
      const exists = await esClient.indices.exists({
        index,
      });

      if (!exists) {
        results.push(getIndexExistsError(index));
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
        results.push(
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

    const indexFieldsResults = await this.diagnoseIndexFields({
      indices: successfulIndices.join(','),
      fields,
      esClient,
    });
    results.push(...indexFieldsResults);

    return results;
  }

  /**
   * Tries to identify potential issues with the index fields configured for the rule
   * Examples include high cardinality
   */
  private async diagnoseIndexFields({
    indices,
    fields,
    esClient,
  }: {
    indices: string;
    fields: string;
    esClient: ElasticsearchClient;
  }): Promise<DiagnosticResult[]> {
    const body = await esClient.fieldCaps({ index: indices, fields });

    const indexFields = body.fields ?? {};

    // Get cardinality aggregation for aggregatable fields
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

    return results;
  }

  private async diagnoseExecution<Params extends RuleTypeParams>({
    ruleType,
    params,
    scopedClusterClient,
    request,
  }: DiagnoseExecutorOpts<Params>) {
    const results: DiagnosticResult[] = [];
    const savedObjectsClient = this.savedObjects.getScopedClient(request, {
      includedHiddenTypes: ['alert', 'action'],
    });
    const searchSourceClient = this.data.search.searchSource.asScoped(request);
    const uiSettingsClient = this.uiSettings.asScopedToClient(savedObjectsClient);

    try {
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
    } catch (err) {
      results.push({
        type: 'error',
        name: 'Execution error',
        message: err.message,
      });
    }

    return results;
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
