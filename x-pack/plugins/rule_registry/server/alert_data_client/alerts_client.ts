/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { PublicMethodsOf } from '@kbn/utility-types';
import { Filter, buildEsQuery, EsQueryConfig } from '@kbn/es-query';
import { decodeVersion, encodeHitVersion } from '@kbn/securitysolution-es-utils';
import {
  mapConsumerToIndexName,
  isValidFeatureId,
  getSafeSortIds,
  STATUS_VALUES,
  getEsQueryConfig,
} from '@kbn/rule-data-utils/target/alerts_as_data_rbac';

import { InlineScript, QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { AlertTypeParams, AlertingAuthorizationFilterType } from '../../../alerting/server';
import {
  ReadOperations,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationEntity,
} from '../../../alerting/server';
import { Logger, ElasticsearchClient } from '../../../../../src/core/server';
import { alertAuditEvent, operationAlertAuditActionMap } from './audit_events';
import { AuditLogger } from '../../../security/server';
import {
  ALERT_STATUS,
  ALERT_OWNER,
  RULE_ID,
  SPACE_IDS,
} from '../../common/technical_rule_data_field_names';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';

// TODO: Fix typings https://github.com/elastic/kibana/issues/101776
type NonNullableProps<Obj extends {}, Props extends keyof Obj> = Omit<Obj, Props> &
  { [K in Props]-?: NonNullable<Obj[K]> };
type AlertType = NonNullableProps<
  ParsedTechnicalFields,
  typeof RULE_ID | typeof ALERT_OWNER | typeof SPACE_IDS
>;

const isValidAlert = (source?: ParsedTechnicalFields): source is AlertType => {
  return source?.[RULE_ID] != null && source?.[ALERT_OWNER] != null && source?.[SPACE_IDS] != null;
};
export interface ConstructorOptions {
  logger: Logger;
  authorization: PublicMethodsOf<AlertingAuthorization>;
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
}

export interface UpdateOptions<Params extends AlertTypeParams> {
  id: string;
  status: string;
  _version: string | undefined;
  index: string;
}

export interface BulkUpdateOptions<Params extends AlertTypeParams> {
  ids: string[] | undefined | null;
  status: STATUS_VALUES;
  index: string;
  query: string | undefined | null;
}

interface GetAlertParams {
  id: string;
  index?: string;
}

interface FetchAndAuditAlertParams {
  id: string | null | undefined;
  query: string | null | undefined;
  index?: string;
  operation: WriteOperations.Update | ReadOperations.Find | ReadOperations.Get;
  lastSortIds: Array<string | number> | undefined;
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

  constructor({ auditLogger, authorization, logger, esClient }: ConstructorOptions) {
    this.logger = logger;
    this.authorization = authorization;
    this.esClient = esClient;
    this.auditLogger = auditLogger;
    // If spaceId is undefined, it means that spaces is disabled
    // Otherwise, if space is enabled and not specified, it is "default"
    this.spaceId = this.authorization.getSpaceId();
  }

  private async ensureAllAuthorized(
    items: Array<{
      _id: string;
      // this is typed kind of crazy to fit the output of es api response to this
      _source?:
        | { [RULE_ID]?: string | null | undefined; [ALERT_OWNER]?: string | null | undefined }
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
            [RULE_ID]: hit?._source?.[RULE_ID],
            [ALERT_OWNER]: hit?._source?.[ALERT_OWNER],
          },
        ],
      }),
      { hitIds: [], ownersAndRuleTypeIds: [] } as {
        hitIds: string[];
        ownersAndRuleTypeIds: Array<{
          [RULE_ID]: string | null | undefined;
          [ALERT_OWNER]: string | null | undefined;
        }>;
      }
    );

    const assertString = (hit: unknown): hit is string => hit !== null && hit !== undefined;

    return Promise.all(
      ownersAndRuleTypeIds.map((hit) => {
        const alertOwner = hit?.[ALERT_OWNER];
        const ruleId = hit?.[RULE_ID];
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
  private async fetchAlertAndAudit({
    id,
    query,
    index,
    operation,
    lastSortIds = [],
  }: FetchAndAuditAlertParams) {
    try {
      const alertSpaceId = this.spaceId;
      if (alertSpaceId == null) {
        const errorMessage = 'Failed to acquire spaceId from authorization client';
        this.logger.error(`fetchAlertAndAudit threw an error: ${errorMessage}`);
        throw Boom.failedDependency(`fetchAlertAndAudit threw an error: ${errorMessage}`);
      }

      const config = getEsQueryConfig();

      let queryBody = {
        query: await this.buildEsQueryWithAuthz(query, id, alertSpaceId, operation, config),
        sort: [
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
          // @ts-expect-error
          search_after: lastSortIds,
        };
      }

      const result = await this.esClient.search<ParsedTechnicalFields>({
        index: index ?? '.alerts-*',
        ignore_unavailable: true,
        // @ts-expect-error
        body: queryBody,
        seq_no_primary_term: true,
      });

      if (!result?.body.hits.hits.every((hit) => isValidAlert(hit._source))) {
        const errorMessage = `Invalid alert found with id of "${id}" or with query "${query}" and operation ${operation}`;
        this.logger.error(errorMessage);
        throw Boom.badData(errorMessage);
      }

      await this.ensureAllAuthorized(result.body.hits.hits, operation);

      result?.body.hits.hits.map((item) =>
        this.auditLogger?.log(
          alertAuditEvent({
            action: operationAlertAuditActionMap[operation],
            id: item._id,
            outcome: 'unknown',
          })
        )
      );

      return result.body;
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
  private async fetchAlertAuditOperate({
    ids,
    status,
    indexName,
    operation,
  }: {
    ids: string[];
    status: STATUS_VALUES;
    indexName: string;
    operation: ReadOperations.Find | ReadOperations.Get | WriteOperations.Update;
  }) {
    try {
      const mgetRes = await this.esClient.mget<ParsedTechnicalFields>({
        index: indexName,
        body: {
          ids,
        },
      });

      await this.ensureAllAuthorized(mgetRes.body.docs, operation);

      for (const id of ids) {
        this.auditLogger?.log(
          alertAuditEvent({
            action: operationAlertAuditActionMap[operation],
            id,
            ...(operation === WriteOperations.Update ? { outcome: 'unknown' } : { operation }),
          })
        );
      }

      const bulkUpdateRequest = mgetRes.body.docs.flatMap((item) => [
        {
          update: {
            _index: item._index,
            _id: item._id,
          },
        },
        {
          doc: { [ALERT_STATUS]: status },
        },
      ]);

      const bulkUpdateResponse = await this.esClient.bulk({
        body: bulkUpdateRequest,
      });
      return bulkUpdateResponse;
    } catch (exc) {
      this.logger.error(`error in fetchAlertAuditOperate ${exc}`);
      throw exc;
    }
  }

  private async buildEsQueryWithAuthz(
    query: string | null | undefined,
    id: string | null | undefined,
    alertSpaceId: string,
    operation: WriteOperations.Update | ReadOperations.Get | ReadOperations.Find,
    config: EsQueryConfig
  ) {
    try {
      const { filter: authzFilter } = await this.authorization.getAuthorizationFilter(
        AlertingAuthorizationEntity.Alert,
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: { consumer: ALERT_OWNER, ruleTypeId: RULE_ID },
        },
        operation
      );
      return buildEsQuery(
        undefined,
        { query: query == null ? `_id:${id}` : query, language: 'kuery' },
        [
          (authzFilter as unknown) as Filter,
          ({ term: { [SPACE_IDS]: alertSpaceId } } as unknown) as Filter,
        ],
        config
      );
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
    query: string;
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
        const result = await this.fetchAlertAndAudit({
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

  public async get({ id, index }: GetAlertParams) {
    try {
      // first search for the alert by id, then use the alert info to check if user has access to it
      const alert = await this.fetchAlertAndAudit({
        id,
        query: null,
        index,
        operation: ReadOperations.Get,
        lastSortIds: undefined,
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

  public async update<Params extends AlertTypeParams = never>({
    id,
    status,
    _version,
    index,
  }: UpdateOptions<Params>) {
    try {
      const alert = await this.fetchAlertAndAudit({
        id,
        query: null,
        index,
        operation: WriteOperations.Update,
        lastSortIds: undefined,
      });

      if (alert == null || alert.hits.hits.length === 0) {
        const errorMessage = `Unable to retrieve alert details for alert with id of "${id}" and operation ${ReadOperations.Get}`;
        this.logger.error(errorMessage);
        throw Boom.notFound(errorMessage);
      }

      const { body: response } = await this.esClient.update<ParsedTechnicalFields>({
        ...decodeVersion(_version),
        id,
        index,
        body: {
          doc: {
            [ALERT_STATUS]: status,
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

  public async bulkUpdate<Params extends AlertTypeParams = never>({
    ids,
    query,
    index,
    status,
  }: BulkUpdateOptions<Params>) {
    // rejects at the route level if more than 1000 id's are passed in
    if (ids != null) {
      return this.fetchAlertAuditOperate({
        ids,
        status,
        indexName: index,
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
          throw Boom.unauthorized('Failed to audit alerts');
        }

        // executes updateByQuery with query + authorization filter
        // used in the queryAndAuditAllAlerts function
        const result = await this.esClient.updateByQuery({
          index,
          conflicts: 'proceed',
          refresh: true,
          body: {
            script: {
              source: `if (ctx._source['${ALERT_STATUS}'] != null) {
                ctx._source['${ALERT_STATUS}'] = '${status}'
              }
              if (ctx._source['signal.status'] != null) {
                ctx._source['signal.status'] = '${status}'
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

  public async getAuthorizedAlertsIndices(featureIds: string[]): Promise<string[] | undefined> {
    try {
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

      const toReturn = Array.from(authorizedFeatures).flatMap((feature) => {
        if (isValidFeatureId(feature)) {
          return mapConsumerToIndexName[feature];
        }
        return [];
      });

      return toReturn;
    } catch (exc) {
      const errMessage = `getAuthorizedAlertsIndices failed to get authorized rule types: ${exc}`;
      this.logger.error(errMessage);
      throw Boom.failedDependency(errMessage);
    }
  }
}
