/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { snakeCase } from 'lodash/fp';
import { BadRequestError } from '@kbn/securitysolution-es-utils';

import type {
  RouteValidationFunction,
  KibanaResponseFactory,
  CustomHttpResponseOptions,
} from '@kbn/core/server';
import {
  ActionsClientChatOpenAI,
  ActionsClientBedrockChatModel,
  ActionsClientSimpleChatModel,
  ActionsClientChatVertexAI,
} from '@kbn/langchain/server';
import { CustomHttpRequestError } from './custom_http_request_error';

export interface OutputError {
  message: string;
  statusCode: number;
}
export interface BulkError {
  // Id can be single id or stringified ids.
  id?: string;
  error: {
    status_code: number;
    message: string;
  };
}

export const createBulkErrorObject = ({
  id,
  statusCode,
  message,
}: {
  id?: string;
  statusCode: number;
  message: string;
}): BulkError => {
  if (id != null) {
    return {
      id,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else if (id != null) {
    return {
      id,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else {
    return {
      id: '(unknown id)',
      error: {
        status_code: statusCode,
        message,
      },
    };
  }
};

export const transformBulkError = (
  id: string | undefined,
  err: Error & { statusCode?: number }
): BulkError => {
  if (err instanceof CustomHttpRequestError) {
    return createBulkErrorObject({
      id,
      statusCode: err.statusCode ?? 400,
      message: err.message,
    });
  } else if (err instanceof BadRequestError) {
    return createBulkErrorObject({
      id,
      statusCode: 400,
      message: err.message,
    });
  } else {
    return createBulkErrorObject({
      id,
      statusCode: err.statusCode ?? 500,
      message: err.message,
    });
  }
};

interface Schema {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate: (input: any) => { value: any; error?: Error };
}

export const buildRouteValidation =
  <T>(schema: Schema): RouteValidationFunction<T> =>
  (payload: T, { ok, badRequest }) => {
    const { value, error } = schema.validate(payload);
    if (error) {
      return badRequest(error.message);
    }
    return ok(value);
  };

const statusToErrorMessage = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 500:
      return 'Internal Error';
    default:
      return '(unknown error)';
  }
};

export class CustomResponseFactory {
  constructor(private response: KibanaResponseFactory) {}

  error({ statusCode, body, headers }: CustomHttpResponseOptions<string>) {
    const contentType: CustomHttpResponseOptions<string>['headers'] = {
      'content-type': 'application/json',
    };
    const defaultedHeaders: CustomHttpResponseOptions<string>['headers'] = {
      ...contentType,
      ...(headers ?? {}),
    };

    return this.response.custom({
      headers: defaultedHeaders,
      statusCode,
      body: Buffer.from(
        JSON.stringify({
          message: body ?? statusToErrorMessage(statusCode),
          status_code: statusCode,
        })
      ),
    });
  }
}

export const buildResponse = (response: KibanaResponseFactory) =>
  new CustomResponseFactory(response);

export const convertToSnakeCase = <T extends Record<string, unknown>>(
  obj: T
): Partial<T> | null => {
  if (!obj) {
    return null;
  }
  return Object.keys(obj).reduce((acc, item) => {
    const newKey = snakeCase(item);
    return { ...acc, [newKey]: obj[item] };
  }, {});
};

/**
 * Returns the LangChain `llmType` for the given actionTypeId
 */
export const getLlmType = (actionTypeId: string): string | undefined => {
  const llmTypeDictionary: Record<string, string> = {
    [`.gen-ai`]: `openai`,
    [`.bedrock`]: `bedrock`,
    [`.gemini`]: `gemini`,
  };
  return llmTypeDictionary[actionTypeId];
};

export const getLlmClass = (llmType?: string, bedrockChatEnabled?: boolean) =>
  llmType === 'openai'
    ? ActionsClientChatOpenAI
    : llmType === 'bedrock' && bedrockChatEnabled
    ? ActionsClientBedrockChatModel
    : llmType === 'gemini' && bedrockChatEnabled
    ? ActionsClientChatVertexAI
    : ActionsClientSimpleChatModel;
