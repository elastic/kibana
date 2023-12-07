/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, uniqueId } from 'lodash';
import { DeepPartial } from 'utility-types';
import { MessageRole, Conversation, FunctionDefinition, Message } from '../../common/types';
import { getAssistantSetupMessage } from '../service/get_assistant_setup_message';

type BuildMessageProps = DeepPartial<Message> & {
  message: {
    role: MessageRole;
    function_call?: {
      name: string;
      trigger: MessageRole.Assistant | MessageRole.User | MessageRole.Elastic;
    };
  };
};

export function buildMessage(params: BuildMessageProps): Message {
  return merge(
    {
      '@timestamp': new Date().toISOString(),
    },
    params
  );
}

export function buildSystemMessage(
  params?: Omit<BuildMessageProps, 'message'> & {
    message: DeepPartial<Omit<Message['message'], 'role'>>;
  }
) {
  return buildMessage(
    merge({}, params, {
      message: { role: MessageRole.System },
    })
  );
}

export function buildUserMessage(
  params?: Omit<BuildMessageProps, 'message'> & {
    message?: DeepPartial<Omit<Message['message'], 'role'>>;
  }
) {
  return buildMessage(
    merge(
      {
        message: {
          content: "What's a function?",
        },
      },
      params,
      {
        message: { role: MessageRole.User },
      }
    )
  );
}

export function buildAssistantMessage(
  params?: Omit<BuildMessageProps, 'message'> & {
    message: DeepPartial<Omit<Message['message'], 'role'>>;
  }
) {
  return buildMessage(
    merge(
      {
        message: {
          content: `In computer programming and mathematics, a function is a fundamental concept that represents a relationship between input values and output values. It takes one or more input values (also known as arguments or parameters) and processes them to produce a result, which is the output of the function. The input values are passed to the function, and the function performs a specific set of operations or calculations on those inputs to produce the desired output.
          A function is often defined with a name, which serves as an identifier to call and use the function in the code. It can be thought of as a reusable block of code that can be executed whenever needed, and it helps in organizing code and making it more modular and maintainable.`,
        },
      },
      params,
      {
        message: { role: MessageRole.Assistant },
      }
    )
  );
}

export function buildFunctionResponseMessage(
  params?: Omit<BuildMessageProps, 'message'> & {
    message: DeepPartial<Omit<Message['message'], 'role'>>;
  }
) {
  return buildUserMessage(
    merge(
      {},
      {
        message: {
          name: 'leftpad',
        },
        ...params,
      }
    )
  );
}

export function buildConversation(params?: Partial<Conversation>) {
  return {
    '@timestamp': '',
    user: {
      name: 'foo',
    },
    conversation: {
      id: uniqueId(),
      title: '',
      last_updated: '',
    },
    messages: [getAssistantSetupMessage({ contexts: [] })],
    labels: {},
    numeric_labels: {},
    namespace: '',
    ...params,
  };
}

export function buildFunction(): FunctionDefinition {
  return {
    options: {
      name: 'elasticsearch',
      contexts: ['core'],
      description: 'Call Elasticsearch APIs on behalf of the user',
      descriptionForUser: 'Call Elasticsearch APIs on behalf of the user',
      parameters: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            description: 'The HTTP method of the Elasticsearch endpoint',
            enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
          },
          path: {
            type: 'string',
            description: 'The path of the Elasticsearch endpoint, including query parameters',
          },
        },
        required: ['method' as const, 'path' as const],
      },
    },
    respond: async (options: { arguments: any }, signal: AbortSignal) => ({}),
  };
}

export const buildFunctionElasticsearch = buildFunction;

export function buildFunctionServiceSummary(): FunctionDefinition {
  return {
    options: {
      name: 'get_service_summary',
      contexts: ['core'],
      description:
        'Gets a summary of a single service, including: the language, service version, deployments, infrastructure, alerting, etc. ',
      descriptionForUser: 'Get a summary for a single service.',
      parameters: {
        type: 'object',
      },
    },
    respond: async (options: { arguments: any }, signal: AbortSignal) => ({}),
  };
}
