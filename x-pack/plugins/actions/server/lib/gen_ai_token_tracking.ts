/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough, Readable } from 'stream';
import { Logger } from '@kbn/logging';
import { finished } from 'stream/promises';
import { getTokenCountFromBedrockInvoke } from './get_token_count_from_bedrock_invoke';
import { ActionTypeExecutorRawResult } from '../../common';
import { getTokenCountFromOpenAI } from './get_token_count_from_openai_stream';
import { getTokenCountFromInvokeStream, InvokeBody } from './get_token_count_from_invoke_stream';

type ValidatedParams =
  | {
      subAction: 'invokeAI';
      subActionParams: {
        messages: Array<{ content: string }>;
      };
    }
  | {
      subAction: 'run' | 'test';
      subActionParams: {
        body: string;
      };
    }
  | {
      subAction: 'invokeStream';
      subActionParams: InvokeBody;
    }
  | {
      subAction: 'invokeOpenAiStream';
      subActionParams: { body: string };
    };

type ActionTypeId = '.gen-ai' | '.bedrock';

/*
 * Calculates the total, prompt, and completion token counts from different types of responses.
 * It handles both streamed and non-streamed responses from OpenAI and Bedrock.
 * It returns null if it cannot calculate the token counts.
 * @param actionTypeId the action type id
 * @param logger the logger
 * @param result the result from the action executor
 * @param validatedParams the validated params from the action executor
 */

export async function getGenAiTokenTracking({
  actionTypeId,
  logger,
  result,
  validatedParams,
}: {
  actionTypeId: ActionTypeId;
  logger: Logger;
  result: ActionTypeExecutorRawResult<unknown>;
  validatedParams: ValidatedParams;
}): Promise<{
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
} | null> {
  // this is a streamed OpenAI or Bedrock response, using the subAction invokeStream to stream the response as a simple string
  if (validatedParams.subAction === 'invokeStream' && result.data instanceof Readable) {
    try {
      const { total, prompt, completion } = await getTokenCountFromInvokeStream({
        responseStream: result.data.pipe(new PassThrough()),
        actionTypeId,
        body: validatedParams.subActionParams,
        logger,
      });
      return {
        total_tokens: total,
        prompt_tokens: prompt,
        completion_tokens: completion,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from Invoke Stream subaction streaming response');
      logger.error(e);
    }
  }

  // this is a streamed OpenAI response, which did not use the subAction invokeStream
  if (validatedParams.subAction === 'invokeOpenAiStream' && result.data instanceof Readable) {
    const responseBodyChunks = await getResponseBodyChunksFromStream(
      result.data.pipe(new PassThrough()),
      logger
    );

    const { subActionParams } = validatedParams;

    try {
      const { total, prompt, completion } = await getTokenCountFromOpenAI({
        responseBodyChunks,
        requestBody: subActionParams.body,
      });
      return {
        total_tokens: total,
        prompt_tokens: prompt,
        completion_tokens: completion,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from streaming response');
      logger.error(e);
    }
  }

  // this is a non-streamed OpenAI response, which comes with the usage object
  if (actionTypeId === '.gen-ai') {
    const data = result.data as unknown as {
      usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    if (data.usage == null) {
      logger.error('Response did not contain usage object');
      return null;
    }
    return {
      total_tokens: data.usage?.total_tokens ?? 0,
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    };
  }

  // this is a non-streamed Bedrock response
  if (
    actionTypeId === '.bedrock' &&
    (validatedParams.subAction === 'run' || validatedParams.subAction === 'test')
  ) {
    try {
      const { total, prompt, completion } = await getTokenCountFromBedrockInvoke({
        response: (
          result.data as unknown as {
            completion: string;
          }
        ).completion,
        body: (validatedParams as { subActionParams: { body: string } }).subActionParams.body,
      });

      return {
        total_tokens: total,
        prompt_tokens: prompt,
        completion_tokens: completion,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from Bedrock invoke response');
      logger.error(e);
    }
  }

  // this is a non-streamed Bedrock response used by security solution
  if (actionTypeId === '.bedrock' && validatedParams.subAction === 'invokeAI') {
    try {
      const { total, prompt, completion } = await getTokenCountFromBedrockInvoke({
        response: (
          result.data as unknown as {
            message: string;
          }
        ).message,
        body: JSON.stringify({
          prompt: validatedParams.subActionParams.messages[0].content,
        }),
      });

      return {
        total_tokens: total,
        prompt_tokens: prompt,
        completion_tokens: completion,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from Bedrock invoke response');
      logger.error(e);
    }
  }
  return null;
}

export const shouldTrackGenAiToken = (actionTypeId: string) =>
  actionTypeId === '.gen-ai' || actionTypeId === '.bedrock';

export async function getResponseBodyChunksFromStream(responseStream: Readable, logger: Logger) {
  const responseBodyChunks = [] as string[];

  responseStream.on('data', (chunk) => {
    responseBodyChunks.push(chunk.toString());
  });

  try {
    await finished(responseStream);
  } catch (e) {
    logger.error('An error occurred while calculating streaming response tokens');
  }

  return responseBodyChunks;
}
