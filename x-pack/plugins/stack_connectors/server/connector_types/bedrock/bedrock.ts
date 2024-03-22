/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import aws from 'aws4';
import { AxiosError, Method } from 'axios';
import { IncomingMessage } from 'http';
import { PassThrough } from 'stream';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import {
  RunActionParamsSchema,
  InvokeAIActionParamsSchema,
  StreamingResponseSchema,
  RunActionResponseSchema,
  RunApiLatestResponseSchema,
} from '../../../common/bedrock/schema';
import {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
  StreamActionParams,
  RunApiLatestResponse,
} from '../../../common/bedrock/types';
import {
  SUB_ACTION,
  DEFAULT_TOKEN_LIMIT,
  DEFAULT_BEDROCK_MODEL,
} from '../../../common/bedrock/constants';
import {
  DashboardActionParams,
  DashboardActionResponse,
  StreamingResponse,
} from '../../../common/bedrock/types';
import { DashboardActionParamsSchema } from '../../../common/bedrock/schema';

interface SignedRequest {
  host: string;
  headers: Record<string, string>;
  body: string;
  path: string;
}

export class BedrockConnector extends SubActionConnector<Config, Secrets> {
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

The Kibana Connector in use may need to be reconfigured with an updated Amazon Bedrock endpoint, like \`bedrock-runtime\`.`;
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
   * provides the AWS signature to the external API endpoint
   * @param body The request body to be signed.
   * @param path The path of the request URL.
   */
  private signRequest(body: string, path: string, stream: boolean) {
    const { host } = new URL(this.url);
    return aws.sign(
      {
        host,
        headers: stream
          ? {
              accept: 'application/vnd.amazon.eventstream',
              'Content-Type': 'application/json',
              'x-amzn-bedrock-accept': '*/*',
            }
          : {
              'Content-Type': 'application/json',
              Accept: '*/*',
            },
        body,
        path,
        // Despite AWS docs, this value does not always get inferred. We need to always send it
        service: 'bedrock',
      },
      {
        secretAccessKey: this.secrets.secret,
        accessKeyId: this.secrets.accessKey,
      }
    ) as SignedRequest;
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
      genAIProvider: 'Bedrock',
    });

    return { available: response.success };
  }

  private async runApiDeprecated(
    params: SubActionRequestParams<RunActionResponse> // : SubActionRequestParams<RunApiLatestResponseSchema>
  ): Promise<RunActionResponse> {
    const response = await this.request(params);
    return response.data;
  }

  private async runApiLatest(
    params: SubActionRequestParams<RunApiLatestResponse> // : SubActionRequestParams<RunApiLatestResponseSchema>
  ): Promise<RunActionResponse> {
    const response = await this.request(params);
    return {
      completion: parseContent(response.data.content),
      stop_reason: response.data.stop_reason,
    };
  }

  /**
   * responsible for making a POST request to the external API endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async runApi({ body, model: reqModel }: RunActionParams): Promise<RunActionResponse> {
    // set model on per request basis
    const currentModel = reqModel ?? this.model;
    const path = `/model/${currentModel}/invoke`;
    const signed = this.signRequest(body, path, false);
    const requestArgs = {
      ...signed,
      url: `${this.url}${path}`,
      method: 'post' as Method,
      data: body,
      // give up to 2 minutes for response
      timeout: 120000,
    };

    if (usesMessagesApi(currentModel)) {
      return this.runApiLatest({ ...requestArgs, responseSchema: RunApiLatestResponseSchema });
    }
    return this.runApiDeprecated({ ...requestArgs, responseSchema: RunActionResponseSchema });
  }

  /**
   *  NOT INTENDED TO BE CALLED DIRECTLY
   *  call invokeStream instead
   *  responsible for making a POST request to a specified URL with a given request body.
   *  The response is then processed based on whether it is a streaming response or a regular response.
   * @param body The stringified request body to be sent in the POST request.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  private async streamApi({
    body,
    model: reqModel,
  }: StreamActionParams): Promise<StreamingResponse> {
    // set model on per request basis
    const path = `/model/${reqModel ?? this.model}/invoke-with-response-stream`;
    const signed = this.signRequest(body, path, true);

    const response = await this.request({
      ...signed,
      url: `${this.url}${path}`,
      method: 'post',
      responseSchema: StreamingResponseSchema,
      data: body,
      responseType: 'stream',
    });

    return response.data.pipe(new PassThrough());
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
    temperature,
  }: InvokeAIActionParams): Promise<IncomingMessage> {
    const currentModel = model ?? this.model;
    const res = (await this.streamApi({
      body: JSON.stringify(
        usesMessagesApi(currentModel)
          ? formatBedrockMessagesBody({ messages, model, stopSequences, temperature })
          : formatBedrockBody({ messages, model, stopSequences, temperature })
      ),
      model,
    })) as unknown as IncomingMessage;
    return res;
  }

  /**
   * Deprecated. Use invokeStream instead.
   * TODO: remove once streaming work is implemented in langchain mode for security solution
   * tracked here: https://github.com/elastic/security-team/issues/7363
   */
  public async invokeAI({
    messages,
    model,
  }: InvokeAIActionParams): Promise<InvokeAIActionResponse> {
    const currentModel = model ?? this.model;

    const res = await this.runApi({
      body: JSON.stringify(
        usesMessagesApi(currentModel)
          ? formatBedrockMessagesBody({ messages, model })
          : formatBedrockBody({ messages, model })
      ),
      model,
    });
    return { message: res.completion.trim() };
  }
}

const formatBedrockBody = ({
  model = DEFAULT_BEDROCK_MODEL,
  messages,
  stopSequences = ['\n\nHuman:'],
  temperature = 0.5,
}: {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  stopSequences?: string[];
  temperature?: number;
}) => {
  const combinedMessages = messages.reduce((acc: string, message) => {
    const { role, content } = message;
    const [, , modelName, majorVersion, minorVersion] =
      (model || '').match(/(\w+)\.(.*)-v(\d+)(?::(\d+))?/) || [];
    // Claude only has Assistant and Human, so 'user' will be converted to Human
    let bedrockRole: string;

    if (
      role === 'system' &&
      modelName === 'claude' &&
      Number(majorVersion) >= 2 &&
      Number(minorVersion) >= 1
    ) {
      bedrockRole = '';
    } else {
      bedrockRole = role === 'assistant' ? '\n\nAssistant:' : '\n\nHuman:';
    }

    return `${acc}${bedrockRole}${content}`;
  }, '');

  return {
    // end prompt in "Assistant:" to avoid the model starting its message with "Assistant:"
    prompt: `${combinedMessages} \n\nAssistant:`,
    max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
    temperature,
    // prevent model from talking to itself
    stop_sequences: stopSequences,
  };
};

const formatBedrockMessagesBody = ({
  messages,
  stopSequences = ['\n\nHuman:'],
  temperature = 0.5,
}: {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  stopSequences?: string[];
  temperature?: number;
}) => ({
  anthropic_version: 'bedrock-2023-05-31',
  messages,
  max_tokens: DEFAULT_TOKEN_LIMIT,
  temperature,
  stop_sequences: stopSequences,
});

function parseContent(content: Array<{ text?: string; type: string }>): string {
  let parsedContent = '';
  if (content.length === 1 && content[0].type === 'text' && content[0].text) {
    parsedContent = content[0].text;
  } else if (content.length > 1) {
    // TODO need to check this code, i think it can be of type img or something else
    parsedContent = content.reduce((acc, { text }) => (text ? `${acc}\n${text}` : acc), '');
  }
  return parsedContent;
}

const usesMessagesApi = (model: string) =>
  model.split('.')[0] === 'anthropic' &&
  !model.includes('claude-v2') &&
  !model.includes('claude-instant-v1');
