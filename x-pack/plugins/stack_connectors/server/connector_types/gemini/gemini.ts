/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AxiosError, Method } from 'axios';
import axios from 'axios';
// import { VertexAI } from '@google-cloud/vertexai';

// import { IncomingMessage } from 'http';
// import { PassThrough } from 'stream';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import {
  RunActionParamsSchema,
  InvokeAIActionParamsSchema,
  // StreamingResponseSchema,
  RunActionResponseSchema,
  RunApiLatestResponseSchema,
} from '../../../common/gemini/schema';
import {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
  // StreamActionParams,
  RunApiLatestResponse,
} from '../../../common/gemini/types';
import { SUB_ACTION, DEFAULT_TOKEN_LIMIT } from '../../../common/gemini/constants';
import {
  DashboardActionParams,
  DashboardActionResponse,
  // StreamingResponse,
} from '../../../common/gemini/types';
import { DashboardActionParamsSchema } from '../../../common/gemini/schema';

interface Part {
  text: string;
}

interface Content {
  parts: Part[];
  role: string;
}

interface Candidate {
  content: {
    parts: {
      text: string;
    }[];
  };
}

interface Data {
  candidates: Candidate[];
}

export class GeminiConnector extends SubActionConnector<Config, Secrets> {
  private url;
  private model;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.model = this.config.defaultModel;

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
      // Leave space in the string below, \n is not being rendered in the UI
      return `API Error: ${error.response.data.message}

The Kibana Connector in use may need to be reconfigured with an updated Amazon Gemini endpoint, like \`gemini-runtime\`.`;
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

  private async runApiLatest(
    params: SubActionRequestParams<RunApiLatestResponse> // : SubActionRequestParams<RunApiLatestResponseSchema>
  ): Promise<RunActionResponse> {

    /** Call via the JS SDK
     
        const genAI = new GoogleGenerativeAI(this.secrets.apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});  
        const prompt = 'Write a story about a magic backpack';
        
        let text = 'Testing this function!';

        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
        console.log('TEXT', text);
     */
    
    
    /** REST call with error handling
      
    * try {
            const response = await axios.request(params);
            console.log('Response:', response.data);
        } catch (error) {
            // Check if the error is an AxiosError
            if (axios.isAxiosError(error)) {
                // Retrieve detailed error information
                const axiosError = error as AxiosError;
                if (axiosError.response) {
                    // The request was made and the server responded with a status code
                    console.error('Response data:', axiosError.response.data);
                    console.error('Status code:', axiosError.response.status);
                    console.error('Headers:', axiosError.response.headers);
                    console.error('Message:', axiosError.message);
                } else if (axiosError.request) {
                    // The request was made but no response was received
                    console.error('Request:', axiosError.request);
                } else {
                    // Something happened in setting up the request that triggered an error
                    console.error('Error:', axiosError.message);
                }
            } else {
                // Other types of errors (e.g., network error)
                console.error('Error:', error.message);
            }
        }
    */

    const response = await this.request(params);
    const candidate = response.data.candidates[0];
    const completionText = candidate.content.parts[0].text;
    console.log("Content:", candidate.content.parts[0].text);

    return { completion: completionText }
  }

  /**
   * responsible for making a POST request to the external API endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async runApi({ body, model: reqModel }: RunActionParams): Promise<RunActionResponse> {
    // set model on per request basis
    // const currentModel = reqModel ?? this.model;
    const apiKey = this.secrets.apiKey
    console.log('API_KEY', apiKey);

    const path = `/v1beta/models/gemini-pro:generateContent?key=${apiKey}`
    const requestArgs = {
      url: `${this.url}${path}`,
      method: 'post' as Method,
      data: body,
      headers: { 
        'Content-Type': 'application/json'
      },
      // give up to 2 minutes for response
      timeout: 120000,
    };
    
    return this.runApiLatest({ ...requestArgs, responseSchema: RunApiLatestResponseSchema });
  }

  public async invokeAI({
    messages,
    model,
    // stopSequences,
    // system,
    // temperature,
  }: InvokeAIActionParams): Promise<InvokeAIActionResponse> {
    console.log('BEFORE RUN_API CALL');
    const res = await this.runApi({
      body: JSON.stringify({ messages }),
      model,
    });
    console.log('AFTER RUN_API CALL');
    return { message: res.completion };
  }
}


