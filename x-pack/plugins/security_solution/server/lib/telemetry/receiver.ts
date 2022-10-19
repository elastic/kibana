/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  CoreStart,
  IScopedClusterClient,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  AggregationsAggregate,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import {
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  SIGNALS_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import type { TransportResult } from '@elastic/elasticsearch';
import type { Agent, AgentPolicy } from '@kbn/fleet-plugin/common';
import type { AgentClient, AgentPolicyServiceInterface } from '@kbn/fleet-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import {
  exceptionListItemToTelemetryEntry,
  trustedApplicationToTelemetryEntry,
  ruleExceptionListItemToTelemetryEvent,
  metricsResponseToValueListMetaData,
  tlog,
} from './helpers';
import { Fetcher } from '../../endpoint/routes/resolver/tree/utils/fetch';
import type { TreeOptions, TreeResponse } from '../../endpoint/routes/resolver/tree/utils/fetch';
import type { SafeEndpointEvent, ResolverSchema } from '../../../common/endpoint/types';
import type {
  TelemetryEvent,
  EnhancedAlertEvent,
  ESLicense,
  ESClusterInfo,
  GetEndpointListResponse,
  RuleSearchResult,
  ExceptionListItem,
  ValueListMetaData,
  ValueListResponseAggregation,
  ValueListItemsResponseAggregation,
  ValueListExceptionListResponseAggregation,
  ValueListIndicatorMatchResponseAggregation,
} from './types';
import { telemetryConfiguration } from './configuration';

export interface ITelemetryReceiver {
  start(
    core?: CoreStart,
    kibanaIndex?: string,
    alertsIndex?: string,
    endpointContextService?: EndpointAppContextService,
    exceptionListClient?: ExceptionListClient
  ): Promise<void>;

  getClusterInfo(): ESClusterInfo | undefined;

  fetchFleetAgents(): Promise<
    | {
        agents: Agent[];
        total: number;
        page: number;
        perPage: number;
      }
    | undefined
  >;

  fetchEndpointPolicyResponses(
    executeFrom: string,
    executeTo: string
  ): Promise<
    TransportResult<SearchResponse<unknown, Record<string, AggregationsAggregate>>, unknown>
  >;

  fetchEndpointMetrics(
    executeFrom: string,
    executeTo: string
  ): Promise<
    TransportResult<SearchResponse<unknown, Record<string, AggregationsAggregate>>, unknown>
  >;

  fetchEndpointMetadata(
    executeFrom: string,
    executeTo: string
  ): Promise<
    TransportResult<SearchResponse<unknown, Record<string, AggregationsAggregate>>, unknown>
  >;

  fetchDiagnosticAlerts(
    executeFrom: string,
    executeTo: string
  ): Promise<SearchResponse<TelemetryEvent, Record<string, AggregationsAggregate>>>;

  fetchPolicyConfigs(id: string): Promise<AgentPolicy | null | undefined>;

  fetchTrustedApplications(): Promise<{
    data: ExceptionListItem[] | undefined;
    total: number;
    page: number;
    per_page: number;
  }>;

  fetchEndpointList(listId: string): Promise<GetEndpointListResponse>;

  fetchDetectionRules(): Promise<
    TransportResult<
      SearchResponse<RuleSearchResult, Record<string, AggregationsAggregate>>,
      unknown
    >
  >;

  fetchDetectionExceptionList(
    listId: string,
    ruleVersion: number
  ): Promise<{
    data: ExceptionListItem[];
    total: number;
    page: number;
    per_page: number;
  }>;

  fetchClusterInfo(): Promise<ESClusterInfo>;

  fetchLicenseInfo(): Promise<ESLicense | undefined>;

  copyLicenseFields(lic: ESLicense): {
    issuer?: string | undefined;
    issued_to?: string | undefined;
    uid: string;
    status: string;
    type: string;
  };

  fetchPrebuiltRuleAlerts(): Promise<{ events: TelemetryEvent[]; count: number }>;

  fetchTimelineEndpointAlerts(
    interval: number
  ): Promise<SearchResponse<EnhancedAlertEvent, Record<string, AggregationsAggregate>>>;

  buildProcessTree(
    entityId: string,
    resolverSchema: ResolverSchema,
    startOfDay: string,
    endOfDay: string
  ): TreeResponse;

  fetchTimelineEvents(
    nodeIds: string[]
  ): Promise<SearchResponse<SafeEndpointEvent, Record<string, AggregationsAggregate>>>;

  fetchValueListMetaData(interval: number): Promise<ValueListMetaData>;
}

export class TelemetryReceiver implements ITelemetryReceiver {
  private readonly logger: Logger;
  private agentClient?: AgentClient;
  private agentPolicyService?: AgentPolicyServiceInterface;
  private esClient?: ElasticsearchClient;
  private exceptionListClient?: ExceptionListClient;
  private soClient?: SavedObjectsClientContract;
  private kibanaIndex?: string;
  private alertsIndex?: string;
  private clusterInfo?: ESClusterInfo;
  private processTreeFetcher?: Fetcher;
  private readonly maxRecords = 10_000 as const;

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
  }

  public async start(
    core?: CoreStart,
    kibanaIndex?: string,
    alertsIndex?: string,
    endpointContextService?: EndpointAppContextService,
    exceptionListClient?: ExceptionListClient
  ) {
    this.kibanaIndex = kibanaIndex;
    this.alertsIndex = alertsIndex;
    this.agentClient = endpointContextService?.getAgentService()?.asInternalUser;
    this.agentPolicyService = endpointContextService?.getAgentPolicyService();
    this.esClient = core?.elasticsearch.client.asInternalUser;
    this.exceptionListClient = exceptionListClient;
    this.soClient =
      core?.savedObjects.createInternalRepository() as unknown as SavedObjectsClientContract;
    this.clusterInfo = await this.fetchClusterInfo();

    const elasticsearch = core?.elasticsearch.client as unknown as IScopedClusterClient;
    this.processTreeFetcher = new Fetcher(elasticsearch);
  }

  public getClusterInfo(): ESClusterInfo | undefined {
    return this.clusterInfo;
  }

  public async fetchFleetAgents() {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve fleet agents');
    }

    return this.agentClient?.listAgents({
      perPage: this.maxRecords,
      showInactive: true,
      sortField: 'enrolled_at',
      sortOrder: 'desc',
    });
  }

  public async fetchEndpointPolicyResponses(executeFrom: string, executeTo: string) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error(
        'elasticsearch client is unavailable: cannot retrieve elastic endpoint policy responses'
      );
    }

    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `.ds-metrics-endpoint.policy*`,
      ignore_unavailable: false,
      body: {
        size: 0, // no query results required - only aggregation quantity
        query: {
          range: {
            '@timestamp': {
              gte: executeFrom,
              lt: executeTo,
            },
          },
        },
        aggs: {
          policy_responses: {
            terms: {
              size: this.maxRecords,
              field: 'agent.id',
            },
            aggs: {
              latest_response: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc' as const,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    return this.esClient.search(query, { meta: true });
  }

  public async fetchEndpointMetrics(executeFrom: string, executeTo: string) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve elastic endpoint metrics');
    }

    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `.ds-metrics-endpoint.metrics-*`,
      ignore_unavailable: false,
      body: {
        size: 0, // no query results required - only aggregation quantity
        query: {
          range: {
            '@timestamp': {
              gte: executeFrom,
              lt: executeTo,
            },
          },
        },
        aggs: {
          endpoint_agents: {
            terms: {
              field: 'agent.id',
              size: this.maxRecords,
            },
            aggs: {
              latest_metrics: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc' as const,
                      },
                    },
                  ],
                },
              },
            },
          },
          endpoint_count: {
            cardinality: {
              field: 'agent.id',
            },
          },
        },
      },
    };

    return this.esClient.search(query, { meta: true });
  }

  public async fetchEndpointMetadata(executeFrom: string, executeTo: string) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve elastic endpoint metrics');
    }

    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `.ds-metrics-endpoint.metadata-*`,
      ignore_unavailable: false,
      body: {
        size: 0, // no query results required - only aggregation quantity
        query: {
          range: {
            '@timestamp': {
              gte: executeFrom,
              lt: executeTo,
            },
          },
        },
        aggs: {
          endpoint_metadata: {
            terms: {
              field: 'agent.id',
              size: this.maxRecords,
            },
            aggs: {
              latest_metadata: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc' as const,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    return this.esClient.search(query, { meta: true });
  }

  public async fetchDiagnosticAlerts(executeFrom: string, executeTo: string) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve diagnostic alerts');
    }

    const query = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.logs-endpoint.diagnostic.collection-*',
      ignore_unavailable: true,
      size: telemetryConfiguration.telemetry_max_buffer_size,
      body: {
        query: {
          range: {
            'event.ingested': {
              gte: executeFrom,
              lt: executeTo,
            },
          },
        },
        sort: [
          {
            'event.ingested': {
              order: 'desc' as const,
            },
          },
        ],
      },
    };

    return this.esClient.search<TelemetryEvent>(query);
  }

  public async fetchPolicyConfigs(id: string) {
    if (this.soClient === undefined || this.soClient === null) {
      throw Error(
        'saved object client is unavailable: cannot retrieve endpoint policy configurations'
      );
    }

    return this.agentPolicyService?.get(this.soClient, id);
  }

  public async fetchTrustedApplications() {
    if (this?.exceptionListClient === undefined || this?.exceptionListClient === null) {
      throw Error('exception list client is unavailable: cannot retrieve trusted applications');
    }

    // Ensure list is created if it does not exist
    await this.exceptionListClient.createTrustedAppsList();

    const results = await this.exceptionListClient.findExceptionListItem({
      listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
      page: 1,
      perPage: 10_000,
      filter: undefined,
      namespaceType: 'agnostic',
      sortField: 'name',
      sortOrder: 'asc',
    });

    return {
      data: results?.data.map(trustedApplicationToTelemetryEntry),
      total: results?.total ?? 0,
      page: results?.page ?? 1,
      per_page: results?.per_page ?? this.maxRecords,
    };
  }

  public async fetchEndpointList(listId: string): Promise<GetEndpointListResponse> {
    if (this?.exceptionListClient === undefined || this?.exceptionListClient === null) {
      throw Error('exception list client is unavailable: could not retrieve trusted applications');
    }

    // Ensure list is created if it does not exist
    await this.exceptionListClient.createEndpointList();

    const results = await this.exceptionListClient.findExceptionListItem({
      listId,
      page: 1,
      perPage: this.maxRecords,
      filter: undefined,
      namespaceType: 'agnostic',
      sortField: 'name',
      sortOrder: 'asc',
    });

    return {
      data: results?.data.map(exceptionListItemToTelemetryEntry) ?? [],
      total: results?.total ?? 0,
      page: results?.page ?? 1,
      per_page: results?.per_page ?? this.maxRecords,
    };
  }

  /**
   * Gets the elastic rules which are the rules that have immutable set to true and are of a particular rule type
   * @returns The elastic rules
   */
  public async fetchDetectionRules() {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve detection rules');
    }

    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `${this.kibanaIndex}*`,
      ignore_unavailable: true,
      body: {
        size: this.maxRecords,
        query: {
          bool: {
            must: [
              {
                bool: {
                  filter: {
                    terms: {
                      'alert.alertTypeId': [
                        SIGNALS_ID,
                        EQL_RULE_TYPE_ID,
                        ML_RULE_TYPE_ID,
                        QUERY_RULE_TYPE_ID,
                        SAVED_QUERY_RULE_TYPE_ID,
                        INDICATOR_RULE_TYPE_ID,
                        THRESHOLD_RULE_TYPE_ID,
                        NEW_TERMS_RULE_TYPE_ID,
                      ],
                    },
                  },
                },
              },
              {
                bool: {
                  filter: {
                    terms: {
                      'alert.params.immutable': [true],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };
    return this.esClient.search<RuleSearchResult>(query, { meta: true });
  }

  public async fetchDetectionExceptionList(listId: string, ruleVersion: number) {
    if (this?.exceptionListClient === undefined || this?.exceptionListClient === null) {
      throw Error('exception list client is unavailable: could not retrieve trusted applications');
    }

    // Ensure list is created if it does not exist
    await this.exceptionListClient.createTrustedAppsList();

    const results = await this.exceptionListClient?.findExceptionListsItem({
      listId: [listId],
      filter: [],
      perPage: this.maxRecords,
      page: 1,
      sortField: 'exception-list.created_at',
      sortOrder: 'desc',
      namespaceType: ['single'],
    });

    return {
      data: results?.data.map((r) => ruleExceptionListItemToTelemetryEvent(r, ruleVersion)) ?? [],
      total: results?.total ?? 0,
      page: results?.page ?? 1,
      per_page: results?.per_page ?? this.maxRecords,
    };
  }

  /**
   * Fetch an overview of detection rule alerts over the last 3 hours.
   * Filters out custom rules and endpoint rules.
   * @returns total of alerts by rules
   */
  public async fetchPrebuiltRuleAlerts() {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve pre-built rule alerts');
    }

    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `${this.alertsIndex}*`,
      ignore_unavailable: true,
      body: {
        size: 1_000,
        _source: {
          exclude: [
            'message',
            'kibana.alert.rule.note',
            'kibana.alert.rule.parameters.note',
            'powershell.file.script_block_text',
          ],
        },
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must_not: {
                          bool: {
                            should: [
                              {
                                match_phrase: {
                                  'kibana.alert.rule.name': 'Malware Prevention Alert',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          bool: {
                            should: [
                              {
                                match_phrase: {
                                  'kibana.alert.rule.name': 'Malware Detection Alert',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          bool: {
                            should: [
                              {
                                match_phrase: {
                                  'kibana.alert.rule.name': 'Ransomware Prevention Alert',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          bool: {
                            should: [
                              {
                                match_phrase: {
                                  'kibana.alert.rule.name': 'Ransomware Detection Alert',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        'kibana.alert.rule.parameters.immutable': 'true',
                      },
                    },
                  ],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: 'now-1h',
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          prebuilt_rule_alert_count: {
            cardinality: {
              field: 'event.id',
            },
          },
        },
      },
    };

    const response = await this.esClient.search(query, { meta: true });
    tlog(this.logger, `received prebuilt alerts: (${response.body.hits.hits.length})`);

    const telemetryEvents: TelemetryEvent[] = response.body.hits.hits.flatMap((h) =>
      h._source != null ? ([h._source] as TelemetryEvent[]) : []
    );

    const aggregations = response.body?.aggregations as unknown as {
      prebuilt_rule_alert_count: { value: number };
    };

    return { events: telemetryEvents, count: aggregations?.prebuilt_rule_alert_count.value ?? 0 };
  }

  public async fetchTimelineEndpointAlerts(interval: number) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve cluster infomation');
    }

    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `${this.alertsIndex}*`,
      ignore_unavailable: true,
      body: {
        size: 30,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        'event.module': 'endpoint',
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        'kibana.alert.rule.parameters.immutable': 'true',
                      },
                    },
                  ],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: `now-${interval}h`,
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          endpoint_alert_count: {
            cardinality: {
              field: 'event.id',
            },
          },
        },
      },
    };

    return this.esClient.search<EnhancedAlertEvent>(query);
  }

  public async buildProcessTree(
    entityId: string,
    resolverSchema: ResolverSchema,
    startOfDay: string,
    endOfDay: string
  ): TreeResponse {
    if (this.processTreeFetcher === undefined || this.processTreeFetcher === null) {
      throw Error(
        'resolver tree builder is unavailable: cannot build encoded endpoint event graph'
      );
    }

    const request: TreeOptions = {
      ancestors: 200,
      descendants: 500,
      timeRange: {
        from: startOfDay,
        to: endOfDay,
      },
      schema: resolverSchema,
      nodes: [entityId],
      indexPatterns: [`${this.alertsIndex}*`, 'logs-*'],
      descendantLevels: 20,
    };

    return this.processTreeFetcher.tree(request, true);
  }

  public async fetchTimelineEvents(nodeIds: string[]) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve timeline endpoint events');
    }

    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: [`${this.alertsIndex}*`, 'logs-*'],
      ignore_unavailable: true,
      body: {
        size: 100,
        _source: {
          include: [
            '@timestamp',
            'process',
            'event',
            'file',
            'network',
            'dns',
            'kibana.rule.alert.uuid',
          ],
        },
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'process.entity_id': nodeIds,
                },
              },
              {
                term: {
                  'event.category': 'process',
                },
              },
            ],
          },
        },
      },
    };

    return this.esClient.search<SafeEndpointEvent>(query);
  }

  public async fetchValueListMetaData(interval: number) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve diagnostic alerts');
    }

    const listQuery: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.lists-*',
      ignore_unavailable: true,
      body: {
        size: 0, // no query results required - only aggregation quantity
        aggs: {
          total_value_list_count: {
            cardinality: {
              field: 'name',
            },
          },
          type_breakdown: {
            terms: {
              field: 'type',
              size: 50,
            },
          },
        },
      },
    };
    const itemQuery: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.items-*',
      ignore_unavailable: true,
      body: {
        size: 0, // no query results required - only aggregation quantity
        aggs: {
          value_list_item_count: {
            terms: {
              field: 'list_id',
              size: 100,
            },
          },
        },
      },
    };
    const exceptionListQuery: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `${this.kibanaIndex}*`,
      ignore_unavailable: true,
      body: {
        size: 0, // no query results required - only aggregation quantity
        query: {
          bool: {
            must: [{ match: { 'exception-list.entries.type': 'list' } }],
          },
        },
        aggs: {
          vl_included_in_exception_lists_count: {
            cardinality: {
              field: 'exception-list.entries.list.id',
            },
          },
        },
      },
    };
    const indicatorMatchRuleQuery: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `${this.kibanaIndex}*`,
      ignore_unavailable: true,
      body: {
        size: 0,
        query: {
          bool: {
            must: [{ prefix: { 'alert.params.threatIndex': '.items' } }],
          },
        },
        aggs: {
          vl_used_in_indicator_match_rule_count: {
            cardinality: {
              field: 'alert.params.ruleId',
            },
          },
        },
      },
    };
    const [listMetrics, itemMetrics, exceptionListMetrics, indicatorMatchMetrics] =
      await Promise.all([
        this.esClient.search(listQuery),
        this.esClient.search(itemQuery),
        this.esClient.search(exceptionListQuery),
        this.esClient.search(indicatorMatchRuleQuery),
      ]);
    const listMetricsResponse = listMetrics as unknown as ValueListResponseAggregation;
    const itemMetricsResponse = itemMetrics as unknown as ValueListItemsResponseAggregation;
    const exceptionListMetricsResponse =
      exceptionListMetrics as unknown as ValueListExceptionListResponseAggregation;
    const indicatorMatchMetricsResponse =
      indicatorMatchMetrics as unknown as ValueListIndicatorMatchResponseAggregation;
    return metricsResponseToValueListMetaData({
      listMetricsResponse,
      itemMetricsResponse,
      exceptionListMetricsResponse,
      indicatorMatchMetricsResponse,
    });
  }

  public async fetchClusterInfo(): Promise<ESClusterInfo> {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve cluster infomation');
    }

    // @ts-expect-error version.build_date is of type estypes.DateTime
    return this.esClient.info();
  }

  public async fetchLicenseInfo(): Promise<ESLicense | undefined> {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve license information');
    }

    try {
      const ret = (await this.esClient.transport.request({
        method: 'GET',
        path: '/_license',
        querystring: {
          local: true,
        },
      })) as { license: ESLicense };

      return ret.license;
    } catch (err) {
      tlog(this.logger, `failed retrieving license: ${err}`);
      return undefined;
    }
  }

  public copyLicenseFields(lic: ESLicense) {
    return {
      uid: lic.uid,
      status: lic.status,
      type: lic.type,
      ...(lic.issued_to ? { issued_to: lic.issued_to } : {}),
      ...(lic.issuer ? { issuer: lic.issuer } : {}),
    };
  }
}
