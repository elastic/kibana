/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { CoreKibanaRequest } from '@kbn/core/server';
import { CASES_CONNECTOR_SUB_ACTION } from './constants';
import type { CasesConnectorConfig, CasesConnectorRunParams, CasesConnectorSecrets } from './types';
import { CasesConnectorRunParamsSchema } from './schema';
import { CasesOracleService } from './cases_oracle_service';
import { CasesService } from './cases_service';
import type { CasesClient } from '../../client';
import {
  CasesConnectorError,
  isCasesClientError,
  isCasesConnectorError,
} from './cases_connector_error';
import { CasesConnectorExecutor } from './cases_connector_executor';
import { CaseConnectorRetryService } from './retry_service';
import { fullJitterBackoffFactory } from './full_jitter_backoff';

interface CasesConnectorParams {
  connectorParams: ServiceParams<CasesConnectorConfig, CasesConnectorSecrets>;
  casesParams: { getCasesClient: (request: KibanaRequest) => Promise<CasesClient> };
}

export class CasesConnector extends SubActionConnector<
  CasesConnectorConfig,
  CasesConnectorSecrets
> {
  private readonly casesOracleService: CasesOracleService;
  private readonly casesService: CasesService;
  private readonly retryService: CaseConnectorRetryService;
  private readonly kibanaRequest: KibanaRequest;
  private readonly casesParams: CasesConnectorParams['casesParams'];

  constructor({ connectorParams, casesParams }: CasesConnectorParams) {
    super(connectorParams);

    this.casesOracleService = new CasesOracleService({
      logger: this.logger,
      /**
       * TODO: Think about permissions etc.
       * Should we use our own savedObjectsClient as we do
       * in the cases client? Should we so the createInternalRepository?
       */
      unsecuredSavedObjectsClient: this.savedObjectsClient,
    });

    this.casesService = new CasesService();

    /**
     * We should wait at least 5ms before retrying and no more that 2sec
     */
    const backOffFactory = fullJitterBackoffFactory({ baseDelay: 5, maxBackoffTime: 2000 });
    this.retryService = new CaseConnectorRetryService(this.logger, backOffFactory);

    /**
     * TODO: Get request from the actions framework.
     * Should be set in the SubActionConnector's constructor
     */
    this.kibanaRequest = CoreKibanaRequest.from({ path: '/', headers: {} });

    this.casesParams = casesParams;

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: CASES_CONNECTOR_SUB_ACTION.RUN,
      method: 'run',
      schema: CasesConnectorRunParamsSchema,
    });
  }

  /**
   * Method is not needed for the Case Connector.
   * The function throws an error as a reminder to
   * implement it if we need it in the future.
   */
  protected getResponseErrorMessage(): string {
    throw new Error('Method not implemented.');
  }

  public async run(params: CasesConnectorRunParams) {
    /**
     * TODO: Tell the task manager to not retry on non
     * retryable errors
     */
    await this.retryService.retryWithBackoff(() => this._run(params));
  }

  private async _run(params: CasesConnectorRunParams) {
    try {
      const casesClient = await this.casesParams.getCasesClient(this.kibanaRequest);

      const connectorExecutor = new CasesConnectorExecutor({
        logger: this.logger,
        casesOracleService: this.casesOracleService,
        casesService: this.casesService,
        casesClient,
      });

      this.logDebugCurrentState('start', '[CasesConnector][_run] Executing case connector', params);

      await connectorExecutor.execute(params);

      this.logDebugCurrentState(
        'success',
        '[CasesConnector][_run] Execution of case connector succeeded',
        params
      );
    } catch (error) {
      if (isCasesConnectorError(error)) {
        this.logError(error);
        throw error;
      }

      if (isCasesClientError(error)) {
        const caseConnectorError = new CasesConnectorError(
          error.message,
          error.boomify().output.statusCode
        );

        this.logError(caseConnectorError);
        throw caseConnectorError;
      }

      const caseConnectorError = new CasesConnectorError(error.message, 500);
      this.logError(caseConnectorError);

      throw caseConnectorError;
    } finally {
      this.logDebugCurrentState(
        'end',
        '[CasesConnector][_run] Execution of case connector ended',
        params
      );
    }
  }

  private logDebugCurrentState(state: string, message: string, params: CasesConnectorRunParams) {
    const alertIds = params.alerts.map(({ _id }) => _id);

    this.logger.debug(`[CasesConnector][_run] ${message}`, {
      labels: {
        ruleId: params.rule.id,
        groupingBy: params.groupingBy,
        totalAlerts: params.alerts.length,
        timeWindow: params.timeWindow,
        reopenClosedCases: params.reopenClosedCases,
        owner: params.owner,
      },
      tags: [`cases-connector:${state}`, params.rule.id, ...alertIds],
    });
  }

  private logError(error: CasesConnectorError) {
    this.logger.error(
      `[CasesConnector][_run] Execution of case connector failed. Message: ${error.message}. Status code: ${error.statusCode}`,
      {
        error: {
          stack_trace: error.stack,
          code: error.statusCode.toString(),
          type: 'CasesConnectorError',
        },
      }
    );
  }
}
