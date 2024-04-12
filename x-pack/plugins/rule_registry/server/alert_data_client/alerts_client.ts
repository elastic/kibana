/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { PublicMethodsOf } from '@kbn/utility-types';
import { Filter, buildEsQuery, EsQueryConfig } from '@kbn/es-query';
import { decodeVersion, encodeHitVersion } from '@kbn/securitysolution-es-utils';
import {
  ALERT_TIME_RANGE,
  ALERT_STATUS,
  getEsQueryConfig,
  getSafeSortIds,
  isValidFeatureId,
  STATUS_VALUES,
  ValidFeatureId,
  ALERT_STATUS_RECOVERED,
  ALERT_END,
  ALERT_STATUS_ACTIVE,
  ALERT_CASE_IDS,
  MAX_CASES_PER_ALERT,
  AlertConsumers,
} from '@kbn/rule-data-utils';

import {
  InlineScript,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  RuleTypeParams,
  PluginStartContract as AlertingStart,
  AuthorizationOptions,
} from '@kbn/alerting-plugin/server';
import {
  ReadOperations,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationEntity,
} from '@kbn/alerting-plugin/server';
import { Logger, ElasticsearchClient, EcsEvent } from '@kbn/core/server';
import { AuditLogger } from '@kbn/security-plugin/server';
import { FieldDescriptor, IndexPatternsFetcher } from '@kbn/data-plugin/server';
import { isEmpty } from 'lodash';
import { RuleTypeRegistry } from '@kbn/alerting-plugin/server/types';
import { BrowserFields } from '../../common';
import { alertAuditEvent, operationAlertAuditActionMap } from './audit_events';
import {
  ALERT_WORKFLOW_STATUS,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  SPACE_IDS,
} from '../../common/technical_rule_data_field_names';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';
import { IRuleDataService } from '../rule_data_plugin_service';
import { getAuthzFilter, getSpacesFilter } from '../lib';
import { fieldDescriptorToBrowserFieldMapper } from './browser_fields';

// TODO: Fix typings https://github.com/elastic/kibana/issues/101776
type NonNullableProps<Obj extends {}, Props extends keyof Obj> = Omit<Obj, Props> & {
  [K in Props]-?: NonNullable<Obj[K]>;
};
type AlertType = { _index: string; _id: string } & NonNullableProps<
  ParsedTechnicalFields,
  typeof ALERT_RULE_TYPE_ID | typeof ALERT_RULE_CONSUMER | typeof SPACE_IDS
>;

const isValidAlert = (source?: estypes.SearchHit<ParsedTechnicalFields>): source is AlertType => {
  return (
    (source?._source?.[ALERT_RULE_TYPE_ID] != null &&
      source?._source?.[ALERT_RULE_CONSUMER] != null &&
      source?._source?.[SPACE_IDS] != null) ||
    (source?.fields?.[ALERT_RULE_TYPE_ID][0] != null &&
      source?.fields?.[ALERT_RULE_CONSUMER][0] != null &&
      source?.fields?.[SPACE_IDS][0] != null)
  );
};

export interface ConstructorOptions {
  logger: Logger;
  authorization: PublicMethodsOf<AlertingAuthorization>;
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
  ruleDataService: IRuleDataService;
  getRuleType: RuleTypeRegistry['get'];
  getRuleList: RuleTypeRegistry['list'];
  getAlertIndicesAlias: AlertingStart['getAlertIndicesAlias'];
}

type AlertsClientAuthorizationOptions =
  | {
      featureIds: string[];
      ruleTypeIds?: never;
    }
  | {
      featureIds?: never;
      ruleTypeIds: string[];
    };

export interface UpdateOptions<Params extends RuleTypeParams> {
  id: string;
  status: string;
  _version: string | undefined;
  index: string;
}

export interface BulkUpdateOptions<Params extends RuleTypeParams> {
  ids: string[] | undefined | null;
  status: STATUS_VALUES;
  index: string;
  query: object | string | undefined | null;
}

interface MgetAndAuditAlert {
  id: string;
  index: string;
}

export interface BulkUpdateCasesOptions {
  alerts: MgetAndAuditAlert[];
  caseIds: string[];
}

export interface RemoveCaseIdFromAlertsOptions {
  alerts: MgetAndAuditAlert[];
  caseId: string;
}

interface GetAlertParams {
  id: string;
  index?: string;
}

type GetAlertSummaryParams = {
  id?: string;
  gte: string;
  lte: string;
  filter?: estypes.QueryDslQueryContainer[];
  fixedInterval?: string;
} & AlertsClientAuthorizationOptions;

type SingleSearchAfterAndAudit = {
  id?: string | null | undefined;
  query?: string | object | undefined;
  aggs?: Record<string, any> | undefined;
  index?: string;
  _source?: string[] | undefined;
  track_total_hits?: boolean | number;
  size?: number | undefined;
  operation: WriteOperations.Update | ReadOperations.Find | ReadOperations.Get;
  sort?: estypes.SortOptions[] | undefined;
  lastSortIds?: Array<string | number> | undefined;
} & (
  | {
      featureIds?: string[];
      ruleTypeIds?: never;
    }
  | {
      featureIds?: never;
      ruleTypeIds?: string[];
    }
);
/**
 * Provides apis to interact with alerts as data
 * ensures the request is authorized to perform read / write actions
 * on alerts as data.
 */
export class AlertsClient {
  private readonly logger: Logger;
  private readonly auditLogger?: AuditLogger;
  private readonly authorization: PublicMethodsOf<AlertingAuthorization>;
  private readonly esClient: ElasticsearchClient;
  private readonly spaceId: string | undefined;
  private readonly ruleDataService: IRuleDataService;
  private readonly getRuleType: RuleTypeRegistry['get'];
  private readonly getRuleList: RuleTypeRegistry['list'];
  private getAlertIndicesAlias!: AlertingStart['getAlertIndicesAlias'];

  constructor(options: ConstructorOptions) {
    this.logger = options.logger;
    this.authorization = options.authorization;
    this.esClient = options.esClient;
    this.auditLogger = options.auditLogger;
    // If spaceId is undefined, it means that spaces is disabled
    // Otherwise, if space is enabled and not specified, it is "default"
    this.spaceId = this.authorization.getSpaceId();
    this.ruleDataService = options.ruleDataService;
    this.getRuleType = options.getRuleType;
    this.getRuleList = options.getRuleList;
    this.getAlertIndicesAlias = options.getAlertIndicesAlias;
  }

  private getOutcome(
    operation: WriteOperations.Update | ReadOperations.Find | ReadOperations.Get
  ): { outcome: EcsEvent['outcome'] } {
    return {
      outcome: operation === WriteOperations.Update ? 'unknown' : 'success',
    };
  }

  private getAlertStatusFieldUpdate(
    source: ParsedTechnicalFields | undefined,
    status: STATUS_VALUES
  ) {
    return source?.[ALERT_WORKFLOW_STATUS] == null
      ? { signal: { status } }
      : { [ALERT_WORKFLOW_STATUS]: status };
  }

  private getAlertCaseIdsFieldUpdate(source: ParsedTechnicalFields | undefined, caseIds: string[]) {
    const uniqueCaseIds = new Set([...(source?.[ALERT_CASE_IDS] ?? []), ...caseIds]);

    return { [ALERT_CASE_IDS]: Array.from(uniqueCaseIds.values()) };
  }

  private validateTotalCasesPerAlert(source: ParsedTechnicalFields | undefined, caseIds: string[]) {
    const currentCaseIds = source?.[ALERT_CASE_IDS] ?? [];

    if (currentCaseIds.length + caseIds.length > MAX_CASES_PER_ALERT) {
      throw Boom.badRequest(`You cannot attach more than ${MAX_CASES_PER_ALERT} cases to an alert`);
    }
  }

  /**
   * Accepts an array of ES documents and executes ensureAuthorized for the given operation
   * @param items
   * @param operation
   * @returns
   */
  private async ensureAllAuthorized(
    items: Array<{
      _id: string;
      // this is typed kind of crazy to fit the output of es api response to this
      _source?:
        | {
            [ALERT_RULE_TYPE_ID]?: string | null | undefined;
            [ALERT_RULE_CONSUMER]?: string | null | undefined;
          }
        | null
        | undefined;
    }>,
    operation: ReadOperations.Find | ReadOperations.Get | WriteOperations.Update
  ) {
    const { hitIds, ownersAndRuleTypeIds } = items.reduce(
      (acc, hit) => ({
        hitIds: [hit._id, ...acc.hitIds],
        ownersAndRuleTypeIds: [
          {
            [ALERT_RULE_TYPE_ID]: hit?._source?.[ALERT_RULE_TYPE_ID],
            [ALERT_RULE_CONSUMER]: hit?._source?.[ALERT_RULE_CONSUMER],
          },
        ],
      }),
      { hitIds: [], ownersAndRuleTypeIds: [] } as {
        hitIds: string[];
        ownersAndRuleTypeIds: Array<{
          [ALERT_RULE_TYPE_ID]: string | null | undefined;
          [ALERT_RULE_CONSUMER]: string | null | undefined;
        }>;
      }
    );

    const assertString = (hit: unknown): hit is string => hit !== null && hit !== undefined;

    return Promise.all(
      ownersAndRuleTypeIds.map((hit) => {
        const alertOwner = hit?.[ALERT_RULE_CONSUMER];
        const ruleId = hit?.[ALERT_RULE_TYPE_ID];
        if (hit != null && assertString(alertOwner) && assertString(ruleId)) {
          return this.authorization.ensureAuthorized({
            ruleTypeId: ruleId,
            consumer: alertOwner,
            operation,
            entity: AlertingAuthorizationEntity.Alert,
          });
        }
      })
    ).catch((error) => {
      for (const hitId of hitIds) {
        this.auditLogger?.log(
          alertAuditEvent({
            action: operationAlertAuditActionMap[operation],
            id: hitId,
            error,
          })
        );
      }
      throw error;
    });
  }

  /**
   * This will be used as a part of the "find" api
   * In the future we will add an "aggs" param
   * @param param0
   * @returns
   */
  private async singleSearchAfterAndAudit({
    id,
    query,
    aggs,
    _source,
    track_total_hits: trackTotalHits,
    size,
    index,
    operation,
    sort,
    lastSortIds = [],
    featureIds,
    ruleTypeIds,
  }: SingleSearchAfterAndAudit) {
    try {
      const alertSpaceId = this.spaceId;
      if (alertSpaceId == null) {
        const errorMessage = 'Failed to acquire spaceId from authorization client';
        this.logger.error(`fetchAlertAndAudit threw an error: ${errorMessage}`);
        throw Boom.failedDependency(`fetchAlertAndAudit threw an error: ${errorMessage}`);
      }

      const config = getEsQueryConfig();

      let queryBody: estypes.SearchRequest['body'] = {
        fields: [ALERT_RULE_TYPE_ID, ALERT_RULE_CONSUMER, ALERT_WORKFLOW_STATUS, SPACE_IDS],
        query: await this.buildEsQueryWithAuthz(
          query,
          id,
          alertSpaceId,
          operation,
          config,
          featureIds
            ? {
                featureIds: new Set(featureIds),
              }
            : { ruleTypeIds: new Set(ruleTypeIds) }
        ),
        aggs,
        _source,
        track_total_hits: trackTotalHits,
        size,
        sort: sort || [
          {
            '@timestamp': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
        ],
      };

      if (lastSortIds.length > 0) {
        queryBody = {
          ...queryBody,
          search_after: lastSortIds,
        };
      }

      const result = await this.esClient.search<ParsedTechnicalFields>({
        index: index ?? '.alerts-*',
        ignore_unavailable: true,
        body: queryBody,
        seq_no_primary_term: true,
      });

      if (!result?.hits.hits.every((hit) => isValidAlert(hit))) {
        const errorMessage = `Invalid alert found with id of "${id}" or with query "${query}" and operation ${operation}`;
        this.logger.error(errorMessage);
        throw Boom.badData(errorMessage);
      }

      if (result?.hits?.hits != null && result?.hits.hits.length > 0) {
        await this.ensureAllAuthorized(result.hits.hits, operation);

        result?.hits.hits.map((item) =>
          this.auditLogger?.log(
            alertAuditEvent({
              action: operationAlertAuditActionMap[operation],
              id: item._id,
              ...this.getOutcome(operation),
            })
          )
        );
      }

      return result;
    } catch (error) {
      const errorMessage = `Unable to retrieve alert details for alert with id of "${id}" or with query "${query}" and operation ${operation} \nError: ${error}`;
      this.logger.error(errorMessage);
      throw Boom.notFound(errorMessage);
    }
  }

  /**
   * When an update by ids is requested, do a multi-get, ensure authz and audit alerts, then execute bulk update
   * @param param0
   * @returns
   */
  private async mgetAlertsAuditOperate({
    alerts,
    operation,
    fieldToUpdate,
    validate,
  }: {
    alerts: MgetAndAuditAlert[];
    operation: ReadOperations.Find | ReadOperations.Get | WriteOperations.Update;
    fieldToUpdate: (source: ParsedTechnicalFields | undefined) => Record<string, unknown>;
    validate?: (source: ParsedTechnicalFields | undefined) => void;
  }) {
    try {
      const mgetRes = await this.ensureAllAlertsAuthorized({ alerts, operation });

      const updateRequests = [];

      for (const item of mgetRes.docs) {
        if (validate) {
          // @ts-expect-error doesn't handle error branch in MGetResponse
          validate(item?._source);
        }

        updateRequests.push([
          {
            update: {
              _index: item._index,
              _id: item._id,
            },
          },
          {
            doc: {
              // @ts-expect-error doesn't handle error branch in MGetResponse
              ...fieldToUpdate(item?._source),
            },
          },
        ]);
      }

      const bulkUpdateRequest = updateRequests.flat();

      const bulkUpdateResponse = await this.esClient.bulk({
        refresh: 'wait_for',
        body: bulkUpdateRequest,
      });
      return bulkUpdateResponse;
    } catch (exc) {
      this.logger.error(`error in mgetAlertsAuditOperate ${exc}`);
      throw exc;
    }
  }

  /**
   * When an update by ids is requested, do a multi-get, ensure authz and audit alerts, then execute bulk update
   * @param param0
   * @returns
   */
  private async mgetAlertsAuditOperateStatus({
    alerts,
    status,
    operation,
  }: {
    alerts: MgetAndAuditAlert[];
    status: STATUS_VALUES;
    operation: ReadOperations.Find | ReadOperations.Get | WriteOperations.Update;
  }) {
    return this.mgetAlertsAuditOperate({
      alerts,
      operation,
      fieldToUpdate: (source) => this.getAlertStatusFieldUpdate(source, status),
    });
  }

  private async buildEsQueryWithAuthz(
    query: object | string | null | undefined,
    id: string | null | undefined,
    alertSpaceId: string,
    operation: WriteOperations.Update | ReadOperations.Get | ReadOperations.Find,
    config: EsQueryConfig,
    options: AuthorizationOptions
  ) {
    try {
      const authzFilter = (await getAuthzFilter(this.authorization, operation, options)) as Filter;
      const spacesFilter = getSpacesFilter(alertSpaceId) as unknown as Filter;
      let esQuery;
      if (id != null) {
        esQuery = { query: `_id:${id}`, language: 'kuery' };
      } else if (typeof query === 'string') {
        esQuery = { query, language: 'kuery' };
      } else if (query != null && typeof query === 'object') {
        esQuery = [];
      }
      const builtQuery = buildEsQuery(
        undefined,
        esQuery == null ? { query: ``, language: 'kuery' } : esQuery,
        [authzFilter, spacesFilter],
        config
      );
      if (query != null && typeof query === 'object') {
        return {
          ...builtQuery,
          bool: {
            ...builtQuery.bool,
            must: [...builtQuery.bool.must, query],
          },
        };
      }
      return builtQuery;
    } catch (exc) {
      this.logger.error(exc);
      throw Boom.expectationFailed(
        `buildEsQueryWithAuthz threw an error: unable to get authorization filter \n ${exc}`
      );
    }
  }

  /**
   * executes a search after to find alerts with query (+ authz filter)
   * @param param0
   * @returns
   */
  private async queryAndAuditAllAlerts({
    index,
    query,
    operation,
  }: {
    index: string;
    query: object | string;
    operation: WriteOperations.Update | ReadOperations.Find | ReadOperations.Get;
  }) {
    let lastSortIds;
    let hasSortIds = true;
    const alertSpaceId = this.spaceId;
    if (alertSpaceId == null) {
      this.logger.error('Failed to acquire spaceId from authorization client');
      return;
    }

    const config = getEsQueryConfig();

    const authorizedQuery = await this.buildEsQueryWithAuthz(
      query,
      null,
      alertSpaceId,
      operation,
      config,
      {}
    );

    while (hasSortIds) {
      try {
        const result = await this.singleSearchAfterAndAudit({
          id: null,
          query,
          index,
          operation,
          lastSortIds,
        });

        if (lastSortIds != null && result?.hits.hits.length === 0) {
          return { auditedAlerts: true, authorizedQuery };
        }
        if (result == null) {
          this.logger.error('RESULT WAS EMPTY');
          return { auditedAlerts: false, authorizedQuery };
        }
        if (result.hits.hits.length === 0) {
          this.logger.error('Search resulted in no hits');
          return { auditedAlerts: true, authorizedQuery };
        }

        lastSortIds = getSafeSortIds(result.hits.hits[result.hits.hits.length - 1]?.sort);
        if (lastSortIds != null && lastSortIds.length !== 0) {
          hasSortIds = true;
        } else {
          hasSortIds = false;
          return { auditedAlerts: true, authorizedQuery };
        }
      } catch (error) {
        const errorMessage = `queryAndAuditAllAlerts threw an error: Unable to retrieve alerts with query "${query}" and operation ${operation} \n ${error}`;
        this.logger.error(errorMessage);
        throw Boom.notFound(errorMessage);
      }
    }
  }

  /**
   * Ensures that the user has access to the alerts
   * for a given operation
   */
  private async ensureAllAlertsAuthorized({
    alerts,
    operation,
  }: {
    alerts: MgetAndAuditAlert[];
    operation: ReadOperations.Find | ReadOperations.Get | WriteOperations.Update;
  }) {
    try {
      const mgetRes = await this.esClient.mget<ParsedTechnicalFields>({
        docs: alerts.map(({ id, index }) => ({ _id: id, _index: index })),
      });

      await this.ensureAllAuthorized(mgetRes.docs, operation);
      const ids = mgetRes.docs.map(({ _id }) => _id);

      for (const id of ids) {
        this.auditLogger?.log(
          alertAuditEvent({
            action: operationAlertAuditActionMap[operation],
            id,
            ...this.getOutcome(operation),
          })
        );
      }

      return mgetRes;
    } catch (exc) {
      this.logger.error(`error in ensureAllAlertsAuthorized ${exc}`);
      throw exc;
    }
  }

  public async ensureAllAlertsAuthorizedRead({ alerts }: { alerts: MgetAndAuditAlert[] }) {
    try {
      await this.ensureAllAlertsAuthorized({ alerts, operation: ReadOperations.Get });
    } catch (error) {
      this.logger.error(`error authenticating alerts for read access: ${error}`);
      throw error;
    }
  }

  public async get({ id, index }: GetAlertParams) {
    try {
      // first search for the alert by id, then use the alert info to check if user has access to it
      const alert = await this.singleSearchAfterAndAudit({
        id,
        index,
        operation: ReadOperations.Get,
      });

      if (alert == null || alert.hits.hits.length === 0) {
        const errorMessage = `Unable to retrieve alert details for alert with id of "${id}" and operation ${ReadOperations.Get}`;
        this.logger.error(errorMessage);
        throw Boom.notFound(errorMessage);
      }

      // move away from pulling data from _source in the future
      return alert.hits.hits[0]._source;
    } catch (error) {
      this.logger.error(`get threw an error: ${error}`);
      throw error;
    }
  }

  public async getAlertSummary({
    gte,
    lte,
    featureIds,
    filter,
    fixedInterval = '1m',
    ruleTypeIds,
  }: GetAlertSummaryParams) {
    try {
      const indexToUse = featureIds
        ? await this.getAuthorizedAlertsIndicesByFeatureIds(featureIds)
        : ruleTypeIds
        ? await this.getAuthorizedAlertsIndicesByRuleTypeIds(ruleTypeIds)
        : null;

      if (isEmpty(indexToUse)) {
        throw Boom.badRequest('no featureIds were provided for getting alert summary');
      }

      // first search for the alert by id, then use the alert info to check if user has access to it
      const responseAlertSum = await this.singleSearchAfterAndAudit({
        index: (indexToUse ?? []).join(),
        operation: ReadOperations.Get,
        aggs: {
          active_alerts_bucket: {
            date_histogram: {
              field: ALERT_TIME_RANGE,
              fixed_interval: fixedInterval,
              hard_bounds: {
                min: gte,
                max: lte,
              },
              extended_bounds: {
                min: gte,
                max: lte,
              },
              min_doc_count: 0,
            },
          },
          recovered_alerts: {
            filter: {
              term: {
                [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
              },
            },
            aggs: {
              container: {
                date_histogram: {
                  field: ALERT_END,
                  fixed_interval: fixedInterval,
                  extended_bounds: {
                    min: gte,
                    max: lte,
                  },
                  min_doc_count: 0,
                },
              },
            },
          },
          count: {
            terms: { field: ALERT_STATUS },
          },
        },
        query: {
          bool: {
            filter: [
              {
                range: {
                  [ALERT_TIME_RANGE]: {
                    gt: gte,
                    lt: lte,
                  },
                },
              },
              ...(filter ? filter : []),
            ],
          },
        },
        size: 0,
        featureIds,
      });

      let activeAlertCount = 0;
      let recoveredAlertCount = 0;
      (
        ((responseAlertSum.aggregations?.count as estypes.AggregationsMultiBucketAggregateBase)
          ?.buckets as estypes.AggregationsStringTermsBucketKeys[]) ?? []
      ).forEach((b) => {
        if (b.key === ALERT_STATUS_ACTIVE) {
          activeAlertCount = b.doc_count;
        } else if (b.key === ALERT_STATUS_RECOVERED) {
          recoveredAlertCount = b.doc_count;
        }
      });

      return {
        activeAlertCount,
        recoveredAlertCount,
        activeAlerts:
          (
            responseAlertSum.aggregations
              ?.active_alerts_bucket as estypes.AggregationsAutoDateHistogramAggregate
          )?.buckets ?? [],
        recoveredAlerts:
          (
            (responseAlertSum.aggregations?.recovered_alerts as estypes.AggregationsFilterAggregate)
              ?.container as estypes.AggregationsAutoDateHistogramAggregate
          )?.buckets ?? [],
      };
    } catch (error) {
      this.logger.error(`getAlertSummary threw an error: ${error}`);
      throw error;
    }
  }

  public async update<Params extends RuleTypeParams = never>({
    id,
    status,
    _version,
    index,
  }: UpdateOptions<Params>) {
    try {
      const alert = await this.singleSearchAfterAndAudit({
        id,
        index,
        operation: WriteOperations.Update,
      });

      if (alert == null || alert.hits.hits.length === 0) {
        const errorMessage = `Unable to retrieve alert details for alert with id of "${id}" and operation ${ReadOperations.Get}`;
        this.logger.error(errorMessage);
        throw Boom.notFound(errorMessage);
      }
      const fieldToUpdate = this.getAlertStatusFieldUpdate(
        alert?.hits.hits[0]._source,
        status as STATUS_VALUES
      );
      const response = await this.esClient.update<ParsedTechnicalFields>({
        ...decodeVersion(_version),
        id,
        index,
        body: {
          doc: {
            ...fieldToUpdate,
          },
        },
        refresh: 'wait_for',
      });

      return {
        ...response,
        _version: encodeHitVersion(response),
      };
    } catch (error) {
      this.logger.error(`update threw an error: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate<Params extends RuleTypeParams = never>({
    ids,
    query,
    index,
    status,
  }: BulkUpdateOptions<Params>) {
    // rejects at the route level if more than 1000 id's are passed in
    if (ids != null) {
      const alerts = ids.map((id) => ({ id, index }));
      return this.mgetAlertsAuditOperateStatus({
        alerts,
        status,
        operation: WriteOperations.Update,
      });
    } else if (query != null) {
      try {
        // execute search after with query + authorization filter
        // audit results of that query
        const fetchAndAuditResponse = await this.queryAndAuditAllAlerts({
          query,
          index,
          operation: WriteOperations.Update,
        });

        if (!fetchAndAuditResponse?.auditedAlerts) {
          throw Boom.forbidden('Failed to audit alerts');
        }

        // executes updateByQuery with query + authorization filter
        // used in the queryAndAuditAllAlerts function
        const result = await this.esClient.updateByQuery({
          index,
          conflicts: 'proceed',
          body: {
            script: {
              source: `if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
                ctx._source['${ALERT_WORKFLOW_STATUS}'] = '${status}'
              }
              if (ctx._source.signal != null && ctx._source.signal.status != null) {
                ctx._source.signal.status = '${status}'
              }`,
              lang: 'painless',
            } as InlineScript,
            query: fetchAndAuditResponse.authorizedQuery as Omit<QueryDslQueryContainer, 'script'>,
          },
          ignore_unavailable: true,
        });
        return result;
      } catch (err) {
        this.logger.error(`bulkUpdate threw an error: ${err}`);
        throw err;
      }
    } else {
      throw Boom.badRequest('no ids or query were provided for updating');
    }
  }

  /**
   * This function updates the case ids of multiple alerts per index.
   * It is supposed to be used only by Cases.
   * Cases implements its own RBAC. By using this function directly
   * Cases RBAC is bypassed.
   * Plugins that want to attach alerts to a case should use the
   * cases client that does all the necessary cases RBAC checks
   * before updating the alert with the case ids.
   */
  public async bulkUpdateCases({ alerts, caseIds }: BulkUpdateCasesOptions) {
    if (alerts.length === 0) {
      throw Boom.badRequest('You need to define at least one alert to update case ids');
    }

    /**
     * We do this check to avoid any mget calls or authorization checks.
     * The check below does not ensure that an alert may exceed the limit.
     * We need to also throw in case alert.caseIds + caseIds > MAX_CASES_PER_ALERT.
     * The validateTotalCasesPerAlert function ensures that.
     */
    if (caseIds.length > MAX_CASES_PER_ALERT) {
      throw Boom.badRequest(`You cannot attach more than ${MAX_CASES_PER_ALERT} cases to an alert`);
    }

    return this.mgetAlertsAuditOperate({
      alerts,
      /**
       * A user with read access to an alert and write access to a case should be able to link
       * the case to the alert (update the alert's data to include the case ids).
       * For that reason, the operation is a read operation.
       */
      operation: ReadOperations.Get,
      fieldToUpdate: (source) => this.getAlertCaseIdsFieldUpdate(source, caseIds),
      validate: (source) => this.validateTotalCasesPerAlert(source, caseIds),
    });
  }

  public async removeCaseIdFromAlerts({ caseId, alerts }: RemoveCaseIdFromAlertsOptions) {
    /**
     * We intentionally do not perform any authorization
     * on the alerts. Users should be able to remove
     * cases from alerts when deleting a case or an
     * attachment
     */
    try {
      if (alerts.length === 0) {
        return;
      }

      const painlessScript = `if (ctx._source['${ALERT_CASE_IDS}'] != null) {
        if (ctx._source['${ALERT_CASE_IDS}'].contains('${caseId}')) {
          int index = ctx._source['${ALERT_CASE_IDS}'].indexOf('${caseId}');
          ctx._source['${ALERT_CASE_IDS}'].remove(index);
        }
      }`;

      const bulkUpdateRequest = [];

      for (const alert of alerts) {
        bulkUpdateRequest.push(
          {
            update: {
              _index: alert.index,
              _id: alert.id,
            },
          },
          {
            script: { source: painlessScript, lang: 'painless' },
          }
        );
      }

      await this.esClient.bulk({
        refresh: 'wait_for',
        body: bulkUpdateRequest,
      });
    } catch (error) {
      this.logger.error(`Error removing case ${caseId} from alerts: ${error}`);
      throw error;
    }
  }

  public async removeCaseIdsFromAllAlerts({ caseIds }: { caseIds: string[] }) {
    /**
     * We intentionally do not perform any authorization
     * on the alerts. Users should be able to remove
     * cases from alerts when deleting a case or an
     * attachment
     */
    try {
      if (caseIds.length === 0) {
        return;
      }

      const index = `${this.ruleDataService.getResourcePrefix()}-*`;
      const query = `${ALERT_CASE_IDS}: (${caseIds.join(' or ')})`;
      const esQuery = buildEsQuery(undefined, { query, language: 'kuery' }, []);

      const SCRIPT_PARAMS_ID = 'caseIds';

      const painlessScript = `if (ctx._source['${ALERT_CASE_IDS}'] != null && ctx._source['${ALERT_CASE_IDS}'].length > 0 && params['${SCRIPT_PARAMS_ID}'] != null && params['${SCRIPT_PARAMS_ID}'].length > 0) {
        List storedCaseIds = ctx._source['${ALERT_CASE_IDS}'];
        List caseIdsToRemove = params['${SCRIPT_PARAMS_ID}'];

        for (int i=0; i < caseIdsToRemove.length; i++) {
          if (storedCaseIds.contains(caseIdsToRemove[i])) {
            int index = storedCaseIds.indexOf(caseIdsToRemove[i]);
            storedCaseIds.remove(index);
          }
        }
      }`;

      await this.esClient.updateByQuery({
        index,
        conflicts: 'proceed',
        body: {
          script: {
            source: painlessScript,
            lang: 'painless',
            params: { caseIds },
          } as InlineScript,
          query: esQuery,
        },
        ignore_unavailable: true,
      });
    } catch (err) {
      this.logger.error(`Failed removing ${caseIds} from all alerts: ${err}`);
      throw err;
    }
  }

  public async find<Params extends RuleTypeParams = never>({
    aggs,
    featureIds,
    index,
    query,
    ruleTypeIds,
    search_after: searchAfter,
    size,
    sort,
    track_total_hits: trackTotalHits,
    _source,
  }: {
    aggs?: object;
    index?: string;
    query?: object;
    search_after?: Array<string | number>;
    size?: number;
    sort?: estypes.SortOptions[];
    track_total_hits?: boolean | number;
    _source?: string[];
  } & AlertsClientAuthorizationOptions) {
    try {
      let indexToUse = index;
      if (featureIds && !isEmpty(featureIds)) {
        const tempIndexToUse = await this.getAuthorizedAlertsIndicesByFeatureIds(featureIds);
        if (!isEmpty(tempIndexToUse)) {
          indexToUse = (tempIndexToUse ?? []).join();
        }
      } else if (ruleTypeIds && !isEmpty(ruleTypeIds)) {
        const tempIndexToUse = await this.getAuthorizedAlertsIndicesByRuleTypeIds(ruleTypeIds);
        if (!isEmpty(tempIndexToUse)) {
          indexToUse = (tempIndexToUse ?? []).join();
        }
      }

      // first search for the alert by id, then use the alert info to check if user has access to it
      const alertsSearchResponse = await this.singleSearchAfterAndAudit({
        query,
        aggs,
        _source,
        track_total_hits: trackTotalHits,
        size,
        index: indexToUse,
        operation: ReadOperations.Find,
        sort,
        lastSortIds: searchAfter,
      });

      if (alertsSearchResponse == null) {
        const errorMessage = `Unable to retrieve alert details for alert with query and operation ${ReadOperations.Find}`;
        this.logger.error(errorMessage);
        throw Boom.notFound(errorMessage);
      }

      return alertsSearchResponse;
    } catch (error) {
      this.logger.error(`find threw an error: ${error}`);
      throw error;
    }
  }

  public async getAuthorizedAlertsIndicesByFeatureIds(
    featureIds: string[]
  ): Promise<string[] | undefined> {
    try {
      const authorizedRuleTypes = await this.authorization.getAuthorizedRuleTypes(
        AlertingAuthorizationEntity.Alert,
        { featureIds: new Set(featureIds) }
      );
      const indices = this.getAlertIndicesAlias(
        authorizedRuleTypes.map((art: { id: any }) => art.id),
        this.spaceId
      );

      return indices;
    } catch (exc) {
      const errMessage = `getAuthorizedAlertsIndices failed to get authorized rule types: ${exc}`;
      this.logger.error(errMessage);
      throw Boom.failedDependency(errMessage);
    }
  }

  public async getAuthorizedAlertsIndicesByRuleTypeIds(
    ruleTypeIds: string[]
  ): Promise<string[] | undefined> {
    try {
      const authorizedRuleTypes = await this.authorization.getAuthorizedRuleTypes(
        AlertingAuthorizationEntity.Alert,
        { ruleTypeIds: new Set(ruleTypeIds) }
      );
      const indices = this.getAlertIndicesAlias(
        authorizedRuleTypes.map((art: { id: any }) => art.id),
        this.spaceId
      );

      return indices;
    } catch (exc) {
      const errMessage = `getAuthorizedAlertsIndices failed to get authorized rule types: ${exc}`;
      this.logger.error(errMessage);
      throw Boom.failedDependency(errMessage);
    }
  }

  public async getFeatureIdsByRegistrationContexts(
    RegistrationContexts: string[]
  ): Promise<string[]> {
    try {
      const featureIds =
        this.ruleDataService.findFeatureIdsByRegistrationContexts(RegistrationContexts);
      if (featureIds.length > 0) {
        // ATTENTION FUTURE DEVELOPER when you are a super user the augmentedRuleTypes.authorizedRuleTypes will
        // return all of the features that you can access and does not care about your featureIds
        const augmentedRuleTypes = await this.authorization.getAugmentedRuleTypesWithAuthorization(
          featureIds,
          [ReadOperations.Find, ReadOperations.Get, WriteOperations.Update],
          AlertingAuthorizationEntity.Alert
        );
        // As long as the user can read a minimum of one type of rule type produced by the provided feature,
        // the user should be provided that features' alerts index.
        // Limiting which alerts that user can read on that index will be done via the findAuthorizationFilter
        const authorizedFeatures = new Set<string>();
        for (const ruleType of augmentedRuleTypes.authorizedRuleTypes) {
          authorizedFeatures.add(ruleType.producer);
        }
        const validAuthorizedFeatures = Array.from(authorizedFeatures).filter(
          (feature): feature is ValidFeatureId =>
            featureIds.includes(feature) && isValidFeatureId(feature)
        );
        return validAuthorizedFeatures;
      }
      return featureIds;
    } catch (exc) {
      const errMessage = `getFeatureIdsByRegistrationContexts failed to get feature ids: ${exc}`;
      this.logger.error(errMessage);
      throw Boom.failedDependency(errMessage);
    }
  }

  public async getBrowserFields({
    featureIds,
    ruleTypeIds,
    indices,
    metaFields,
    allowNoIndex,
  }: {
    indices: string[];
    metaFields: string[];
    allowNoIndex: boolean;
  } & AlertsClientAuthorizationOptions): Promise<{
    browserFields: BrowserFields;
    fields: FieldDescriptor[];
  }> {
    const indexPatternsFetcherAsInternalUser = new IndexPatternsFetcher(this.esClient);
    const ruleTypeList = this.getRuleList();
    const fieldsForAAD = new Set<string>();
    for (const rule of ruleTypeList) {
      if (
        ((featureIds && featureIds.includes(rule.producer)) || ruleTypeIds?.includes(rule.id)) &&
        rule.hasFieldsForAAD
      ) {
        (rule.fieldsForAAD ?? []).forEach((f) => {
          fieldsForAAD.add(f);
        });
      }
    }
    const { fields } = await indexPatternsFetcherAsInternalUser.getFieldsForWildcard({
      pattern: indices,
      metaFields,
      fieldCapsOptions: { allow_no_indices: allowNoIndex },
      fields: [...fieldsForAAD, 'kibana.*'],
    });

    return {
      browserFields: fieldDescriptorToBrowserFieldMapper(fields),
      fields,
    };
  }

  public async getAADFields({ ruleTypeId }: { ruleTypeId: string }) {
    const { producer, fieldsForAAD = [] } = this.getRuleType(ruleTypeId);
    if (producer === AlertConsumers.SIEM) {
      throw Boom.badRequest(`Security solution rule type is not supported`);
    }
    const indices = await this.getAuthorizedAlertsIndicesByRuleTypeIds([ruleTypeId]);
    const indexPatternsFetcherAsInternalUser = new IndexPatternsFetcher(this.esClient);
    const { fields = [] } = await indexPatternsFetcherAsInternalUser.getFieldsForWildcard({
      pattern: indices ?? [],
      metaFields: ['_id', '_index'],
      fieldCapsOptions: { allow_no_indices: true },
      fields: [...fieldsForAAD, 'kibana.*'],
    });

    return fields;
  }
}
