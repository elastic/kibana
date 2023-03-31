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
  AlertConsumers,
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
} from '@kbn/rule-data-utils';

import {
  InlineScript,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RuleTypeParams } from '@kbn/alerting-plugin/server';
import {
  ReadOperations,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationEntity,
} from '@kbn/alerting-plugin/server';
import { Logger, ElasticsearchClient, EcsEvent } from '@kbn/core/server';
import { AuditLogger } from '@kbn/security-plugin/server';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import { isEmpty } from 'lodash';
import { BrowserFields } from '../../common';
import { alertAuditEvent, operationAlertAuditActionMap } from './audit_events';
import {
  ALERT_WORKFLOW_STATUS,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  SPACE_IDS,
} from '../../common/technical_rule_data_field_names';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';
import { Dataset, IRuleDataService } from '../rule_data_plugin_service';
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
}

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

interface GetAlertParams {
  id: string;
  index?: string;
}

interface GetAlertSummaryParams {
  id?: string;
  gte: string;
  lte: string;
  featureIds: string[];
  filter?: estypes.QueryDslQueryContainer[];
  fixedInterval?: string;
}

interface SingleSearchAfterAndAudit {
  id?: string | null | undefined;
  query?: string | object | undefined;
  aggs?: Record<string, any> | undefined;
  index?: string;
  _source?: string[] | undefined;
  track_total_hits?: boolean | undefined;
  size?: number | undefined;
  operation: WriteOperations.Update | ReadOperations.Find | ReadOperations.Get;
  sort?: estypes.SortOptions[] | undefined;
  lastSortIds?: Array<string | number> | undefined;
}

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

  constructor(options: ConstructorOptions) {
    this.logger = options.logger;
    this.authorization = options.authorization;
    this.esClient = options.esClient;
    this.auditLogger = options.auditLogger;
    // If spaceId is undefined, it means that spaces is disabled
    // Otherwise, if space is enabled and not specified, it is "default"
    this.spaceId = this.authorization.getSpaceId();
    this.ruleDataService = options.ruleDataService;
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
        query: await this.buildEsQueryWithAuthz(query, id, alertSpaceId, operation, config),
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
    config: EsQueryConfig
  ) {
    try {
      const authzFilter = (await getAuthzFilter(this.authorization, operation)) as Filter;
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
      config
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
  }: GetAlertSummaryParams) {
    try {
      const indexToUse = await this.getAuthorizedAlertsIndices(featureIds);

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
          refresh: true,
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

  public async find<Params extends RuleTypeParams = never>({
    aggs,
    featureIds,
    index,
    query,
    search_after: searchAfter,
    size,
    sort,
    track_total_hits: trackTotalHits,
    _source,
  }: {
    aggs?: object;
    featureIds?: string[];
    index?: string;
    query?: object;
    search_after?: Array<string | number>;
    size?: number;
    sort?: estypes.SortOptions[];
    track_total_hits?: boolean;
    _source?: string[];
  }) {
    try {
      let indexToUse = index;
      if (featureIds && !isEmpty(featureIds)) {
        const tempIndexToUse = await this.getAuthorizedAlertsIndices(featureIds);
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

  public async getAuthorizedAlertsIndices(featureIds: string[]): Promise<string[] | undefined> {
    try {
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
      const toReturn = validAuthorizedFeatures.map((feature) => {
        const index = this.ruleDataService.findIndexByFeature(feature, Dataset.alerts);
        if (index == null) {
          throw new Error(`This feature id ${feature} should be associated to an alert index`);
        }
        return (
          index?.getPrimaryAlias(feature === AlertConsumers.SIEM ? this.spaceId ?? '*' : '*') ?? ''
        );
      });

      return toReturn;
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
    indices,
    metaFields,
    allowNoIndex,
  }: {
    indices: string[];
    metaFields: string[];
    allowNoIndex: boolean;
  }): Promise<BrowserFields> {
    const indexPatternsFetcherAsInternalUser = new IndexPatternsFetcher(this.esClient);
    const { fields } = await indexPatternsFetcherAsInternalUser.getFieldsForWildcard({
      pattern: indices,
      metaFields,
      fieldCapsOptions: { allow_no_indices: allowNoIndex },
    });

    return fieldDescriptorToBrowserFieldMapper(fields);
  }
}
