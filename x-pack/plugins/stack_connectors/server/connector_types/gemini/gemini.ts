/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { AxiosError, Method } from 'axios';
import {GoogleAuth} from 'google-auth-library';
import { PassThrough } from 'stream';
import { IncomingMessage } from 'http';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import {
  RunActionParamsSchema,
  StreamingResponseSchema,
  RunApiResponseSchema,
  InvokeAIActionParamsSchema,
} from '../../../common/gemini/schema';
import {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  RunApiResponse,
  StreamingResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
} from '../../../common/gemini/types';
import { SUB_ACTION, DEFAULT_TOKEN_LIMIT } from '../../../common/gemini/constants';
import {
  DashboardActionParams,
  DashboardActionResponse,
} from '../../../common/gemini/types';
import { DashboardActionParamsSchema } from '../../../common/gemini/schema';

/** Interfaces to define Gemini model response type */

interface MessagePart {
  text: string;
}

interface MessageContent {
  role: string;
  parts: MessagePart[];
}

interface Payload {
  contents: MessageContent[];
  generation_config: {
      temperature: number;
      maxOutputTokens: number;
  };
}


export class GeminiConnector extends SubActionConnector<Config, Secrets> {
  private url;
  private model;
  private gcpRegion;
  private gcpProjectID;
  private static token: string | null;
  private static tokenExpiryTimeout: NodeJS.Timeout;

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

    this.registerSubAction({
      name: SUB_ACTION.INVOKE_AI,
      method: 'invokeAI',
      schema: InvokeAIActionParamsSchema,
    });
    
    this.registerSubAction({
      name: SUB_ACTION.INVOKE_STREAM,
      method: 'invokeStream',
      schema: InvokeAIActionParamsSchema,
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
    const credentials = JSON.parse(this.secrets.credentialsJson);

    const auth = new GoogleAuth({
      credentials,
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });

    const token = await auth.getAccessToken();
    if (token) {
      GeminiConnector.token = token;
      // Clear any existing timeout
      clearTimeout(GeminiConnector.tokenExpiryTimeout);

      // Set a timeout to reset the token after 45 minutes (it expires after 60 minutes)
      GeminiConnector.tokenExpiryTimeout = setTimeout(() => {
        GeminiConnector.token = null;
      }, 45 * 60 * 1000);
    }
    return token || null; 
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
   const token = GeminiConnector.token ? GeminiConnector.token: await this.getAccessToken();
   const requestArgs = {
     url: `${this.url}${path}`,
     method: 'post' as Method,
     data: body,
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     signal,
     timeout,
   };

   return this.makeApiRequest({ ...requestArgs, responseSchema: RunApiResponseSchema });
 }

  private async streamAPI({
    body,
    model: reqModel,
    signal,
    timeout,
  }: RunActionParams): Promise<StreamingResponse> {
    const currentModel = reqModel ?? this.model;
    const path = `/v1/projects/${this.gcpProjectID}/locations/${this.gcpRegion}/publishers/google/models/${currentModel}:streamGenerateContent?alt=sse`;
    const token = GeminiConnector.token ? GeminiConnector.token: await this.getAccessToken();

    const response = await this.request({
      url: `${this.url}${path}`,
      method: 'post',
      responseSchema: StreamingResponseSchema,
      data: body,
      responseType: 'stream',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal,
      timeout,
    });

    return response.data.pipe(new PassThrough());
  }

  public async invokeAI({
    messages,
    model,
    temperature = 0,
    timeout,
  }: InvokeAIActionParams): Promise<InvokeAIActionResponse> {
    const res = await this.runApi({
        body: JSON.stringify(formatGeminiPayload( messages, temperature)),
        model,
        timeout,
    });

    return { message: res.completion };
  }

  /**
   *  takes in an array of messages and a model as inputs. It calls the streamApi method to make a
   *  request to the Bedrock API with the formatted messages and model. It then returns a Transform stream
   *  that pipes the response from the API through the transformToString function,
   *  which parses the proprietary response into a string of the response text alone
   * @param messages An array of messages to be sent to the API
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async invokeStream({
    messages,
    model,
    stopSequences,
    temperature = 0,
    signal,
    timeout,
  }: InvokeAIActionParams): Promise<IncomingMessage> {
    const res = (await this.streamAPI({
      body: JSON.stringify(formatGeminiPayload(messages, temperature)),
      model,
      stopSequences,
      signal,
      timeout,
    })) as unknown as IncomingMessage;
    return res;
  }

}
/** Format the json body to meet Gemini payload requirements */
const formatGeminiPayload = (data: Array<{ role: string; content: string }>, temperature: number): Payload => {
  let payload: Payload = {
      contents: [],
      generation_config: {
          temperature,
          maxOutputTokens: DEFAULT_TOKEN_LIMIT
      }
  };
  for (const row of data) {
    let correct_role = (row.role == 'assistant') ? 'model' : 'user';
    payload.contents.push({
          role: correct_role,
          parts: [
              {
                  text: row.content
              }
          ]
      });
  }

  return payload;
};
