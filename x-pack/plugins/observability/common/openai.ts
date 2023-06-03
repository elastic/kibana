/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import {
  type ChatCompletionRequestMessage,
  type CreateChatCompletionResponse,
  type CreateChatCompletionResponseChoicesInner,
} from 'openai';

export enum OpenAIProvider {
  OpenAI = 'openAI',
  AzureOpenAI = 'azureOpenAI',
}

export enum OpenAIPromptId {
  ProfilingExplainFunction = 'profilingExplainFunction',
  ProfilingOptimizeFunction = 'profilingOptimizeFunction',
  ApmExplainError = 'apmExplainError',
}

const PERF_GPT_SYSTEM_MESSAGE = {
  content: `You are perf-gpt, a helpful assistant for performance analysis and optimisation
    of software. Answer as concisely as possible.`,
  role: 'system' as const,
};

const APM_GPT_SYSTEM_MESSAGE = {
  content: `You are apm-gpt, a helpful assistant for performance analysis, optimisation and
    root cause analysis of software. Answer as concisely as possible.`,
  role: 'system' as const,
};

function prompt<TParams extends t.Type<any, any, any>>({
  params,
  messages,
}: {
  params: TParams;
  messages: (params: t.OutputOf<TParams>) => ChatCompletionRequestMessage[];
}) {
  return {
    params,
    messages,
  };
}

export const openAiPrompts = {
  [OpenAIPromptId.ProfilingOptimizeFunction]: prompt({
    params: t.type({
      library: t.string,
      functionName: t.string,
    }),
    messages: ({ library, functionName }) => {
      return [
        PERF_GPT_SYSTEM_MESSAGE,
        {
          content: `Assuming the function ${functionName} from the library ${library} is consuming significant CPU resources.
        Suggest ways to optimize or improve the system that involve the ${functionName} function from the
        ${library} library. Types of improvements that would be useful to me are improvements that result in:
        
        - Higher performance so that the system runs faster or uses less CPU
        - Better memory efficient so that the system uses less RAM
        - Better storage efficient so that the system stores less data on disk.
        - Better network I/O efficiency so that less data is sent over the network
        - Better disk I/O efficiency so that less data is read and written from disk
        
        Make up to five suggestions. Your suggestions must meet all of the following criteria:
        1. Your suggestions should detailed, technical and include concrete examples.
        2. Your suggestions should be specific to improving performance of a system in which the ${functionName} function from
        the ${library} library is consuming significant CPU.
        2. If you suggest replacing the function or library with a more efficient replacement you must suggest at least
        one concrete replacement.
        
        If you know of fewer than five ways to improve the performance of a system in which the ${functionName} function from the
        ${library} library is consuming significant CPU, then provide fewer than five suggestions. If you do not know of any
        way in which to improve the performance then say "I do not know how to improve the performance of systems where
        this function is consuming a significant amount of CPU".
        
        If you have suggestions, the output format should look as follows:
        
        Here are some suggestions as to how you might optimize your system if ${functionName} in ${library} is consuming
        significant CPU resources:
        1. Insert first suggestion
        2. Insert second suggestion
        etc.`,
          role: 'user',
        },
      ];
    },
  }),
  [OpenAIPromptId.ProfilingExplainFunction]: prompt({
    params: t.type({
      library: t.string,
      functionName: t.string,
    }),
    messages: ({ library, functionName }) => {
      return [
        PERF_GPT_SYSTEM_MESSAGE,
        {
          content: `I am a software engineer. I am trying to understand what a function in a particular
            software library does.
            
            The library is: ${library}
            The function is: ${functionName}
            
            Your task is to desribe what the library is and what its use cases are, and to describe what the function
            does. The output format should look as follows:
            
            Library description: Provide a concise description of the library
            Library use-cases: Provide a concise description of what the library is typically used for.
            Function description: Provide a concise, technical, description of what the function does.
            `,
          role: 'user',
        },
      ];
    },
  }),
  [OpenAIPromptId.ApmExplainError]: prompt({
    params: t.intersection([
      t.type({
        serviceName: t.string,
        languageName: t.string,
        runtimeName: t.string,
        runtimeVersion: t.string,
        transactionName: t.string,
        logStacktrace: t.string,
        exceptionStacktrace: t.string,
      }),
      t.partial({
        spanName: t.string,
      }),
    ]),
    messages: ({
      serviceName,
      languageName,
      runtimeName,
      runtimeVersion,
      transactionName,
      logStacktrace,
      exceptionStacktrace,
    }) => {
      return [
        APM_GPT_SYSTEM_MESSAGE,
        {
          content: `I'm an SRE. I am looking at an exception and trying to understand what it means.

          Your task is to describe what the error means and what it could be caused by.

          The error occurred on a service called ${serviceName}, which is a ${runtimeName} service written in ${languageName}. The
          runtime version is ${runtimeVersion}.

          The request it occurred for is called ${transactionName}.

          ${
            logStacktrace
              ? `The log stacktrace:
          ${logStacktrace}`
              : ''
          }

          ${
            exceptionStacktrace
              ? `The exception stacktrace:
          ${exceptionStacktrace}`
              : ''
          }
          `,
          role: 'user',
        },
      ];
    },
  }),
};

type PromptMap = typeof openAiPrompts;

export type PromptParamsOf<TPromptId extends OpenAIPromptId> = t.OutputOf<
  {
    [TKey in keyof PromptMap]: PromptMap[TKey];
  }[TPromptId]['params']
>;

export type CreateChatCompletionResponseChunk = Omit<CreateChatCompletionResponse, 'choices'> & {
  choices: Array<
    Omit<CreateChatCompletionResponseChoicesInner, 'message'> & {
      delta: { content?: string };
    }
  >;
};
