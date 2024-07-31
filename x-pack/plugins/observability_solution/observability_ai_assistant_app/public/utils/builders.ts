/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, uniqueId } from 'lodash';
import type { DeepPartial } from 'utility-types';
import {
  type Conversation,
  type Message,
  MessageRole,
} from '@kbn/observability-ai-assistant-plugin/common';

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
    // @ts-expect-error upgrade typescript v5.1.6
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
    // @ts-expect-error upgrade typescript v5.1.6
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
    // @ts-expect-error upgrade typescript v5.1.6
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

export function buildConversation(params?: Partial<Conversation>): Conversation {
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
    messages: [buildSystemMessage()],
    labels: {},
    numeric_labels: {},
    namespace: '',
    public: false,
    ...params,
  };
}
