/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { AxiosError, Method } from 'axios';
import {GoogleAuth} from 'google-auth-library';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import {
  RunActionParamsSchema,
  RunApiResponseSchema,
} from '../../../common/gemini/schema';
import {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  RunApiResponse,
} from '../../../common/gemini/types';
import { SUB_ACTION, DEFAULT_TOKEN_LIMIT } from '../../../common/gemini/constants';
import {
  DashboardActionParams,
  DashboardActionResponse,
} from '../../../common/gemini/types';
import { DashboardActionParamsSchema } from '../../../common/gemini/schema';


export class GeminiConnector extends SubActionConnector<Config, Secrets> {
  private url;
  private model;
  private gcpRegion;
  private gcpProjectID;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.model = this.config.defaultModel;
    this.gcpRegion = this.config.gcpRegion;
    this.gcpProjectID = this.config.gcpProjectID;

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
  private async getAccessToken(): Promise<string> {
    const credentials = JSON.parse(this.secrets.credentialsJson);

    const auth = new GoogleAuth({
      credentials,
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });

    const token = await auth.getAccessToken();
    return token || ''; 
  }

  private async makeApiRequest(
    params: SubActionRequestParams<RunApiResponse> 
  ): Promise<RunActionResponse> {

    const response = await this.request(params);
    const candidate = response.data.candidates[0];
    const completionText = candidate.content.parts[0].text;
    return { completion: completionText }

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
   const data = JSON.stringify(JSON.parse(body)['messages']);
   const token = await this.getAccessToken();

   const requestArgs = {
     url: `${this.url}${path}`,
     method: 'post' as Method,
     data,
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     signal,
     timeout,
   };

   return this.makeApiRequest({ ...requestArgs, responseSchema: RunApiResponseSchema });
 }
}


