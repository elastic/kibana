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
  OpenPointInTimeResponse,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import {
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  SIGNALS_ID,
  THRESHOLD_RULE_TYPE_ID,
  ESQL_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import type {
  SearchHit,
  SearchRequest as ESSearchRequest,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import type { TransportResult } from '@elastic/elasticsearch';
import type { Agent, AgentPolicy, Installation } from '@kbn/fleet-plugin/common';
import type {
  AgentClient,
  AgentPolicyServiceInterface,
  PackageService,
} from '@kbn/fleet-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import moment from 'moment';
import type { ExperimentalFeatures } from '../../../common';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import {
  exceptionListItemToTelemetryEntry,
  trustedApplicationToTelemetryEntry,
  ruleExceptionListItemToTelemetryEvent,
  tlog,
  setClusterInfo,
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
  ValueListResponse,
  ValueListResponseAggregation,
  ValueListItemsResponseAggregation,
  ValueListExceptionListResponseAggregation,
  ValueListIndicatorMatchResponseAggregation,
} from './types';
import { telemetryConfiguration } from './configuration';
import { ENDPOINT_METRICS_INDEX } from '../../../common/constants';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../common/detection_engine/constants';
import { DEFAULT_DIAGNOSTIC_INDEX } from './constants';

export interface ITelemetryReceiver {
  start(
    core?: CoreStart,
    getIndexForType?: (type: string) => string,
    alertsIndex?: string,
    endpointContextService?: EndpointAppContextService,
    exceptionListClient?: ExceptionListClient,
    packageService?: PackageService
  ): Promise<void>;

  getClusterInfo(): ESClusterInfo | undefined;

  fetchClusterInfo(): Promise<ESClusterInfo>;

  fetchLicenseInfo(): Promise<ESLicense | undefined>;

  openPointInTime(indexPattern: string): Promise<string>;

  closePointInTime(pitId: string): Promise<void>;

  fetchDetectionRulesPackageVersion(): Promise<Installation | undefined>;

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

  fetchDiagnosticAlertsBatch(
    executeFrom: string,
    executeTo: string
  ): AsyncGenerator<TelemetryEvent[], void, unknown>;

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

  fetchPrebuiltRuleAlertsBatch(
    pitId: string,
    searchAfterValue: SortResults | undefined
  ): Promise<{
    moreToFetch: boolean;
    newPitId: string;
    searchAfter: SortResults | undefined;
    alerts: TelemetryEvent[];
  }>;

  copyLicenseFields(lic: ESLicense): {
    issuer?: string | undefined;
    issued_to?: string | undefined;
    uid: string;
    status: string;
    type: string;
  };

  fetchTimelineAlerts(
    index: string,
    rangeFrom: string,
    rangeTo: string
  ): Promise<Array<SearchHit<EnhancedAlertEvent>>>;

  buildProcessTree(
    entityId: string,
    resolverSchema: ResolverSchema,
    startOfDay: string,
    endOfDay: string
  ): TreeResponse;

  fetchTimelineEvents(
    nodeIds: string[]
  ): Promise<SearchResponse<SafeEndpointEvent, Record<string, AggregationsAggregate>>>;

  fetchValueListMetaData(interval: number): Promise<ValueListResponse>;

  getAlertsIndex(): string | undefined;

  getExperimentalFeatures(): ExperimentalFeatures | undefined;
}

export class TelemetryReceiver implements ITelemetryReceiver {
  private readonly logger: Logger;
  private agentClient?: AgentClient;
  private agentPolicyService?: AgentPolicyServiceInterface;
  private esClient?: ElasticsearchClient;
  private exceptionListClient?: ExceptionListClient;
  private soClient?: SavedObjectsClientContract;
  private getIndexForType?: (type: string) => string;
  private alertsIndex?: string;
  private clusterInfo?: ESClusterInfo;
  private processTreeFetcher?: Fetcher;
  private packageService?: PackageService;
  private experimentalFeatures: ExperimentalFeatures | undefined;
  private readonly maxRecords = 10_000 as const;

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
  }

  public async start(
    core?: CoreStart,
    getIndexForType?: (type: string) => string,
    alertsIndex?: string,
    endpointContextService?: EndpointAppContextService,
    exceptionListClient?: ExceptionListClient,
    packageService?: PackageService
  ) {
    this.getIndexForType = getIndexForType;
    this.alertsIndex = alertsIndex;
    this.agentClient = endpointContextService?.getInternalFleetServices().agent;
    this.agentPolicyService = endpointContextService?.getInternalFleetServices().agentPolicy;
    this.esClient = core?.elasticsearch.client.asInternalUser;
    this.exceptionListClient = exceptionListClient;
    this.packageService = packageService;
    this.soClient =
      core?.savedObjects.createInternalRepository() as unknown as SavedObjectsClientContract;
    this.clusterInfo = await this.fetchClusterInfo();
    this.experimentalFeatures = endpointContextService?.experimentalFeatures;
    const elasticsearch = core?.elasticsearch.client as unknown as IScopedClusterClient;
    this.processTreeFetcher = new Fetcher(elasticsearch);

    setClusterInfo(this.clusterInfo);
  }

  public getClusterInfo(): ESClusterInfo | undefined {
    return this.clusterInfo;
  }

  public getAlertsIndex(): string | undefined {
    return this.alertsIndex;
  }

  public getExperimentalFeatures(): ExperimentalFeatures | undefined {
    return this.experimentalFeatures;
  }

  public async fetchDetectionRulesPackageVersion(): Promise<Installation | undefined> {
    return this.packageService?.asInternalUser.getInstallation(PREBUILT_RULES_PACKAGE_NAME);
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
      index: ENDPOINT_METRICS_INDEX,
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

  public async *fetchDiagnosticAlertsBatch(executeFrom: string, executeTo: string) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve diagnostic alerts');
    }

    let pitId = await this.openPointInTime(DEFAULT_DIAGNOSTIC_INDEX);
    let fetchMore = true;
    let searchAfter: SortResults | undefined;

    const query: ESSearchRequest = {
      query: {
        range: {
          'event.ingested': {
            gte: executeFrom,
            lt: executeTo,
          },
        },
      },
      track_total_hits: false,
      sort: [
        {
          'event.ingested': {
            order: 'desc' as const,
          },
        },
      ],
      pit: { id: pitId },
      search_after: searchAfter,
      size: telemetryConfiguration.telemetry_max_buffer_size,
    };

    let response = null;
    while (fetchMore) {
      try {
        response = await this.esClient.search(query);
        const numOfHits = response?.hits.hits.length;

        if (numOfHits > 0) {
          const lastHit = response?.hits.hits[numOfHits - 1];
          query.search_after = lastHit?.sort;
        } else {
          fetchMore = false;
        }

        tlog(this.logger, `Diagnostic alerts to return: ${numOfHits}`);
        fetchMore = numOfHits > 0 && numOfHits < telemetryConfiguration.telemetry_max_buffer_size;
      } catch (e) {
        tlog(this.logger, e);
        fetchMore = false;
      }

      if (response == null) {
        await this.closePointInTime(pitId);
        return;
      }

      const alerts = response?.hits.hits.flatMap((h) =>
        h._source != null ? ([h._source] as TelemetryEvent[]) : []
      );

      if (response?.pit_id != null) {
        pitId = response?.pit_id;
      }

      yield alerts;
    }

    this.closePointInTime(pitId);
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

    const timeFrom = moment.utc().subtract(1, 'day').valueOf();
    const results = await this.exceptionListClient.findExceptionListItem({
      listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      page: 1,
      perPage: 10_000,
      filter: `exception-list-agnostic.attributes.created_at >= ${timeFrom}`,
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

    const timeFrom = moment.utc().subtract(1, 'day').valueOf();
    const results = await this.exceptionListClient.findExceptionListItem({
      listId,
      page: 1,
      perPage: this.maxRecords,
      filter: `exception-list-agnostic.attributes.created_at >= ${timeFrom}`,
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
      index: this.getIndexForType?.('alert'),
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
                        ESQL_RULE_TYPE_ID,
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

    const timeFrom = `exception-list.attributes.created_at >= ${moment
      .utc()
      .subtract(24, 'hours')
      .valueOf()}`;

    const results = await this.exceptionListClient?.findExceptionListsItem({
      listId: [listId],
      filter: [timeFrom],
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

  public async fetchPrebuiltRuleAlertsBatch(
    pitId: string,
    searchAfterValue: SortResults | undefined
  ) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('es client is unavailable: cannot retrieve pre-built rule alert batches');
    }

    let newPitId = pitId;
    let fetchMore = true;
    let searchAfter: SortResults | undefined = searchAfterValue;
    const query: ESSearchRequest = {
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
      track_total_hits: false,
      sort: [
        { '@timestamp': { order: 'asc', format: 'strict_date_optional_time_nanos' } },
        { _shard_doc: 'desc' },
      ],
      pit: { id: pitId },
      search_after: searchAfter,
      size: 1_000,
    };

    let response = null;
    try {
      response = await this.esClient.search(query);
      const numOfHits = response?.hits.hits.length;

      if (numOfHits > 0) {
        const lastHit = response?.hits.hits[numOfHits - 1];
        searchAfter = lastHit?.sort;
      }

      fetchMore = numOfHits > 0 && numOfHits < 1_000;
    } catch (e) {
      tlog(this.logger, e);
      fetchMore = false;
    }

    if (response == null) {
      return {
        moreToFetch: false,
        newPitId: pitId,
        searchAfter,
        alerts: [] as TelemetryEvent[],
      };
    }

    const alerts: TelemetryEvent[] = response.hits.hits.flatMap((h) =>
      h._source != null ? ([h._source] as TelemetryEvent[]) : []
    );

    if (response?.pit_id != null) {
      newPitId = response?.pit_id;
    }

    tlog(this.logger, `Prebuilt rule alerts to return: ${alerts.length}`);

    return {
      moreToFetch: fetchMore,
      newPitId,
      searchAfter,
      alerts,
    };
  }

  public async openPointInTime(indexPattern: string) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('es client is unavailable: cannot retrieve pre-built rule alert batches');
    }

    const keepAlive = '5m';
    const pitId: OpenPointInTimeResponse['id'] = (
      await this.esClient.openPointInTime({
        index: `${indexPattern}*`,
        keep_alive: keepAlive,
        expand_wildcards: ['open' as const, 'hidden' as const],
      })
    ).id;

    return pitId;
  }

  public async closePointInTime(pitId: string) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('es client is unavailable: cannot retrieve pre-built rule alert batches');
    }

    try {
      await this.esClient.closePointInTime({ id: pitId });
    } catch (error) {
      tlog(this.logger, `Error trying to close point in time: "${pitId}". Error is: "${error}"`);
    }
  }

  async fetchTimelineAlerts(index: string, rangeFrom: string, rangeTo: string) {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve cluster infomation');
    }

    // default is from looking at Kibana saved objects and online documentation
    const keepAlive = '5m';

    // create and assign an initial point in time
    let pitId: OpenPointInTimeResponse['id'] = (
      await this.esClient.openPointInTime({
        index: `${index}*`,
        keep_alive: keepAlive,
      })
    ).id;

    let fetchMore = true;
    let searchAfter: SortResults | undefined;
    let alertsToReturn: Array<SearchHit<EnhancedAlertEvent>> = [];
    while (fetchMore) {
      const query: ESSearchRequest = {
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
                    gte: rangeFrom,
                    lte: rangeTo,
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
        track_total_hits: false,
        sort: [
          { '@timestamp': { order: 'asc', format: 'strict_date_optional_time_nanos' } },
          { _shard_doc: 'desc' },
        ] as unknown as string[],
        pit: { id: pitId },
        search_after: searchAfter,
        size: 1000,
      };

      tlog(this.logger, `Getting alerts with point in time (PIT) query: ${JSON.stringify(query)}`);

      let response = null;
      try {
        response = await this.esClient.search<EnhancedAlertEvent>(query);
        const numOfHits = response?.hits.hits.length;

        if (numOfHits > 0) {
          const lastHit = response?.hits.hits[numOfHits - 1];
          searchAfter = lastHit?.sort;
        }

        fetchMore = numOfHits > 0;
      } catch (e) {
        tlog(this.logger, e);
        fetchMore = false;
      }

      const alerts = response?.hits.hits;
      alertsToReturn = alertsToReturn.concat(alerts ?? []);

      if (response?.pit_id != null) {
        pitId = response?.pit_id;
      }
    }

    try {
      await this.esClient.closePointInTime({ id: pitId });
    } catch (error) {
      tlog(
        this.logger,
        `Error trying to close point in time: "${pitId}", it will expire within "${keepAlive}". Error is: "${error}"`
      );
    }

    tlog(this.logger, `Timeline alerts to return: ${alertsToReturn.length}`);
    return alertsToReturn || [];
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
      index: this.getIndexForType?.('exception-list'),
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
      index: this.getIndexForType?.('alert'),
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
    return {
      listMetricsResponse,
      itemMetricsResponse,
      exceptionListMetricsResponse,
      indicatorMatchMetricsResponse,
    };
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
