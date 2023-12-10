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
  private readonly kibanaRequest: KibanaRequest;
  private readonly casesParams: CasesConnectorParams['casesParams'];

  constructor({ connectorParams, casesParams }: CasesConnectorParams) {
    super(connectorParams);

    this.casesOracleService = new CasesOracleService({
      log: this.logger,
      /**
       * TODO: Think about permissions etc.
       * Should we use our own savedObjectsClient as we do
       * in the cases client? Should we so the createInternalRepository?
       */
      unsecuredSavedObjectsClient: this.savedObjectsClient,
    });

    this.casesService = new CasesService();

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
    try {
      const casesClient = await this.casesParams.getCasesClient(this.kibanaRequest);

      const connectorExecutor = new CasesConnectorExecutor({
        casesOracleService: this.casesOracleService,
        casesService: this.casesService,
        casesClient,
      });

      await connectorExecutor.execute(params);
    } catch (error) {
      if (isCasesConnectorError(error)) {
        throw error;
      }

      if (isCasesClientError(error)) {
        throw new CasesConnectorError(error.message, error.boomify().output.statusCode);
      }

      throw new CasesConnectorError(error.message, 500);
    }
  }
}
