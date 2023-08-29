/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A mock `data` property from an `actionResult` response, which is returned
 * from the `execute` method of the Actions plugin.
 *
 * Given the following example:
 *
 * ```ts
 * const actionResult = await actionsClient.execute(requestBody);
 * ```
 *
 * In the above example, `actionResult.data` would be this mock data.
 */
export const mockActionResultData = {
  id: 'chatcmpl-7sFVvksgFtMUac3pY5bTypFAKaGX1',
  object: 'chat.completion',
  created: 1693163703,
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: {
        role: 'assistant',
        content: 'Yes, your name is Andrew. How can I assist you further, Andrew?',
      },
    },
  ],
  usage: { completion_tokens: 16, prompt_tokens: 140, total_tokens: 156 },
};
