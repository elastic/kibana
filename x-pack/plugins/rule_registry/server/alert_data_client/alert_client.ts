/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { estypes } from '@elastic/elasticsearch';
import { PublicMethodsOf } from '@kbn/utility-types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { RawAlert } from '../../../alerting/server/types';
import { SanitizedAlert } from '../../../alerting/common';
import { AlertTypeParams, PartialAlert } from '../../../alerting/server';
import {
  ReadOperations,
  AlertingAuthorizationFilterType,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationFilterOpts,
  AlertingAuthorizationEntity,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../alerting/server/authorization';
import { Logger, ElasticsearchClient, HttpResponsePayload } from '../../../../../src/core/server';
import { buildAlertsSearchQuery, buildAlertsUpdateParameters } from './utils';
import { RacAuthorizationAuditLogger } from './audit_logger';

export interface ConstructorOptions {
  logger: Logger;
  authorization: PublicMethodsOf<AlertingAuthorization>;
  spaceId?: string;
  auditLogger: RacAuthorizationAuditLogger;
  esClient: ElasticsearchClient;
}

interface IndexType {
  [key: string]: unknown;
}

export interface FindOptions extends IndexType {
  perPage?: number;
  page?: number;
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  sortField?: string;
  sortOrder?: estypes.SortOrder;
  hasReference?: {
    type: string;
    id: string;
  };
  fields?: string[];
  filter?: string;
}

export interface CreateAlertParams {
  esClient: ElasticsearchClient;
  owner: 'observability' | 'securitySolution';
}

export interface FindResult<Params extends AlertTypeParams> {
  page: number;
  perPage: number;
  total: number;
  data: Array<SanitizedAlert<Params>>;
}

export interface UpdateOptions<Params extends AlertTypeParams> {
  id: string;
  owner: string;
  data: {
    status: string;
  };
}

export interface BulkUpdateOptions<Params extends AlertTypeParams> {
  ids: string[];
  owner: string;
  data: {
    status: string;
  };
}

interface GetAlertParams {
  id: string;
}

export interface GetAlertInstanceSummaryParams {
  id: string;
  dateStart?: string;
}

const alertingAuthorizationFilterOpts: AlertingAuthorizationFilterOpts = {
  type: AlertingAuthorizationFilterType.ESDSL,
  fieldNames: { ruleTypeId: 'alert.alertTypeId', consumer: 'alert.owner' },
};

export class AlertsClient {
  private readonly logger: Logger;
  private readonly auditLogger: RacAuthorizationAuditLogger;
  private readonly spaceId?: string;
  private readonly authorization: PublicMethodsOf<AlertingAuthorization>;
  private readonly esClient: ElasticsearchClient;

  constructor({ auditLogger, authorization, logger, spaceId, esClient }: ConstructorOptions) {
    this.logger = logger;
    this.spaceId = spaceId;
    this.authorization = authorization;
    this.esClient = esClient;
    this.auditLogger = auditLogger;
  }

  // TODO: Type out alerts (rule registry fields + alerting alerts type)
  public async get({ id }: GetAlertParams): Promise<HttpResponsePayload> {
    // first search for the alert specified, then check if user has access to it
    // and return search results
    const query = buildAlertsSearchQuery({
      index: '.alerts-*',
      alertId: id,
    });
    // TODO: Type out alerts (rule registry fields + alerting alerts type)
    const { body: result } = await this.esClient.search<RawAlert>(query);
    // TODO: I thought we were moving away from using _source?
    const hits = result.hits.hits[0]._source;

    try {
      // use security plugin routes to check what URIs user is authorized to
      await this.authorization.ensureAuthorized({
        ruleTypeId: hits['rule.id'],
        consumer: hits['kibana.rac.alert.producer'],
        operation: ReadOperations.Get,
        entity: AlertingAuthorizationEntity.Alert,
      });
    } catch (error) {
      throw Boom.forbidden(
        this.auditLogger.racAuthorizationFailure({
          owner: hits['kibana.rac.alert.producer'],
          operation: ReadOperations.Get,
          type: 'access',
        })
      );
    }

    return result;
  }

  public async find({ owner }: { owner: string }): Promise<unknown> {
    let authorizationTuple;
    try {
      authorizationTuple = await this.authorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Alert,
        alertingAuthorizationFilterOpts
      );
    } catch (error) {
      this.auditLogger.racAuthorizationFailure({
        owner,
        operation: ReadOperations.Find,
        type: 'access',
      });
      throw error;
    }

    const {
      filter: authorizationFilter,
      ensureRuleTypeIsAuthorized,
      logSuccessfulAuthorization,
    } = authorizationTuple;

    try {
      ensureRuleTypeIsAuthorized('siem.signals', owner, AlertingAuthorizationEntity.Alert);
    } catch (error) {
      this.logger.error(`Unable to bulk find alerts for ${owner}. Error follows: ${error}`);
      throw error;
    }
  }

  public async update<Params extends AlertTypeParams = never>({
    id,
    owner,
    data,
  }: UpdateOptions<Params>): Promise<PartialAlert<Params>> {
    // TODO: Type out alerts (rule registry fields + alerting alerts type)
    const result = await this.esClient.get({
      index: '.alerts-observability-apm', // '.siem-signals-devin-hurley-default',
      id,
    });
    console.error('RESULT', result);
    const hits = result.body._source;
    console.error(`ruleTypeId: ${hits['rule.id']} and consumer: ${hits['kibana.rac.alert.owner']}`);

    try {
      // ASSUMPTION: user bulk updating alerts from single owner/space
      // may need to iterate to support rules shared across spaces
      await this.authorization.ensureAuthorized({
        ruleTypeId: hits['rule.id'],
        consumer: hits['kibana.rac.alert.owner'],
        operation: WriteOperations.Update,
        entity: AlertingAuthorizationEntity.Alert,
      });
      console.error('GOT PAST AUTHZ');

      try {
        const index = this.authorization.getAuthorizedAlertsIndices(hits['kibana.rac.alert.owner']);

        console.error('INDEX', index);
        const updateParameters = {
          id,
          index,
          body: {
            doc: {
              'kibana.rac.alert.status': data.status,
            },
          },
        };

        return this.esClient.update(updateParameters);
      } catch (error) {
        // TODO: Update error message
        this.logger.error('');
        console.error('UPDATE ERROR', error);
        throw error;
      }
    } catch (error) {
      console.error('AUTHZ ERROR', error);
      throw Boom.forbidden(
        this.auditLogger.racAuthorizationFailure({
          owner: hits['kibana.rac.alert.producer'],
          operation: ReadOperations.Get,
          type: 'access',
        })
      );
    }
  }

  public async bulkUpdate<Params extends AlertTypeParams = never>({
    ids,
    owner,
    data,
  }: BulkUpdateOptions<Params>): Promise<PartialAlert<Params>> {
    // Looking like we may need to first fetch the alerts to ensure we are
    // pulling the correct ruleTypeId and owner
    // await this.esClient.mget()

    try {
      // ASSUMPTION: user bulk updating alerts from single owner/space
      // may need to iterate to support rules shared across spaces
      await this.authorization.ensureAuthorized({
        ruleTypeId: 'myruletypeid', // can they update multiple at once or will a single one just be passed in?
        consumer: owner,
        operation: WriteOperations.Update,
        entity: AlertingAuthorizationEntity.Alert,
      });

      try {
        const index = this.authorization.getAuthorizedAlertsIndices(owner);
        if (index == null) {
          throw Error(`cannot find authorized index for owner: ${owner}`);
        }
        const updateParameters = buildAlertsUpdateParameters({
          ids,
          index,
          status: data.status,
        });

        return await this.esClient.bulk(updateParameters);
      } catch (updateError) {
        this.logger.error(
          `Unable to bulk update alerts for ${owner}. Error follows: ${updateError}`
        );
        throw updateError;
      }
    } catch (error) {
      throw Boom.forbidden(
        this.auditLogger.racAuthorizationFailure({
          owner,
          operation: ReadOperations.Get,
          type: 'access',
        })
      );
    }
  }
}
