/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { AxiosError, Method } from 'axios';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { getGoogleOAuthJwtAccessToken } from '@kbn/actions-plugin/server/lib/get_gcp_oauth_access_token';
import { Logger } from '@kbn/core/server';
import { ConnectorTokenClientContract } from '@kbn/actions-plugin/server/types';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { RunActionParamsSchema, RunApiResponseSchema } from '../../../common/gemini/schema';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';

import {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  RunApiResponse,
} from '../../../common/gemini/types';
import { SUB_ACTION, DEFAULT_TIMEOUT_MS } from '../../../common/gemini/constants';
import { DashboardActionParams, DashboardActionResponse } from '../../../common/gemini/types';
import { DashboardActionParamsSchema } from '../../../common/gemini/schema';

export interface GetAxiosInstanceOpts {
  connectorId: string;
  logger: Logger;
  credentials: string;
  snServiceUrl: string;
  connectorTokenClient: ConnectorTokenClientContract;
  configurationUtilities: ActionsConfigurationUtilities;
}

export class GeminiConnector extends SubActionConnector<Config, Secrets> {
  private url;
  private model;
  private gcpRegion;
  private gcpProjectID;
  private connectorTokenClient: ConnectorTokenClientContract;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.model = this.config.defaultModel;
    this.gcpRegion = this.config.gcpRegion;
    this.gcpProjectID = this.config.gcpProjectID;
    this.logger = this.logger;
    this.connectorID = this.connector.id;
    this.connectorTokenClient = params.services.connectorTokenClient;

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runApi',
      schema: RunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.DASHBOARD,
      method: 'getDashboard',
      schema: DashboardActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runApi',
      schema: RunActionParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<{ message?: string }>): string {
    if (!error.response?.status) {
      return `Unexpected API Error: ${error.code ?? ''} - ${error.message ?? 'Unknown error'}`;
    }
    if (
      error.response.status === 400 &&
      error.response?.data?.message === 'The requested operation is not recognized by the service.'
    ) {
      return `API Error: ${error.response.data.message}`;
    }
    if (error.response.status === 401) {
      return `Unauthorized API Error${
        error.response?.data?.message ? `: ${error.response.data.message}` : ''
      }`;
    }
    return `API Error: ${error.response?.statusText}${
      error.response?.data?.message ? ` - ${error.response.data.message}` : ''
    }`;
  }

  /**
   *  retrieves a dashboard from the Kibana server and checks if the
   *  user has the necessary privileges to access it.
   * @param dashboardId The ID of the dashboard to retrieve.
   */
  public async getDashboard({
    dashboardId,
  }: DashboardActionParams): Promise<DashboardActionResponse> {
    const privilege = (await this.esClient.transport.request({
      path: '/_security/user/_has_privileges',
      method: 'POST',
      body: {
        index: [
          {
            names: ['.kibana-event-log-*'],
            allow_restricted_indices: true,
            privileges: ['read'],
          },
        ],
      },
    })) as { has_all_requested: boolean };

    if (!privilege?.has_all_requested) {
      return { available: false };
    }

    const response = await initDashboard({
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      dashboardId,
      genAIProvider: 'Gemini',
    });

    return { available: response.success };
  }

  /** Retrieve access token based on the GCP service account credential json file */
  private async getAccessToken(): Promise<string | null> {
    // Validate the service account credentials JSON file input
    let credentialsJSON;
    try {
      credentialsJSON = JSON.parse(this.secrets.credentialsJson);
    } catch (error) {
      throw new Error(`Failed to parse credentials JSON file: Invalid JSON format`);
    }
    const accessToken = await getGoogleOAuthJwtAccessToken({
      connectorId: this.connector.id,
      logger: this.logger,
      credentials: credentialsJSON,
      connectorTokenClient: this.connectorTokenClient,
    });
    return accessToken;
  }
  /**
   * responsible for making a POST request to the Vertex AI API endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async runApi({
    body,
    model: reqModel,
    signal,
    timeout,
  }: RunActionParams): Promise<RunActionResponse> {
    // set model on per request basis
    const currentModel = reqModel ?? this.model;
    const path = `/v1/projects/${this.gcpProjectID}/locations/${this.gcpRegion}/publishers/google/models/${currentModel}:generateContent`;
    const token = await this.getAccessToken();

    const requestArgs = {
      url: `${this.url}${path}`,
      method: 'post' as Method,
      data: body,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal,
      timeout: timeout ?? DEFAULT_TIMEOUT_MS,
      responseSchema: RunApiResponseSchema,
    } as SubActionRequestParams<RunApiResponse>;

    const response = await this.request(requestArgs);
    const candidate = response.data.candidates[0];
    const usageMetadata = response.data.usageMetadata;
    const completionText = candidate.content.parts[0].text;

    return { completion: completionText, usageMetadata };
  }
}
