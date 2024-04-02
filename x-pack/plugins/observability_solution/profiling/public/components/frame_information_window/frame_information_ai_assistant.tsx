/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { Message } from '@kbn/observability-ai-assistant-plugin/public';
import { Frame } from '.';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';

interface Props {
  frame?: Frame;
}

export function FrameInformationAIAssistant({ frame }: Props) {
  const {
    observabilityAIAssistant: {
      ObservabilityAIAssistantContextualInsight,
      getContextualInsightMessages,
    },
  } = useProfilingDependencies().start;

  const promptMessages = useMemo<Message[] | undefined>(() => {
    if (frame?.functionName && frame.exeFileName) {
      const functionName = frame.functionName;
      const library = frame.exeFileName;

      return getContextualInsightMessages({
        message: `I am trying to understand what this function does. Can you help me?`,
        instructions: `The library is: ${library}
        The function is: ${functionName}

        Your have two tasks. Your first task is to desribe what the library is and what its use cases are, and to
        describe what the function does. The output format should look as follows:

        Library description: Provide a concise description of the library
        Library use-cases: Provide a concise description of what the library is typically used for.
        Function description: Provide a concise, technical, description of what the function does.

        Assume the function ${functionName} from the library ${library} is consuming significant CPU resources.
        Your second task is to suggest ways to optimize or improve the system that involve the ${functionName} function from the
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
        3. If you suggest replacing the function or library with a more efficient replacement you must suggest at least
        one concrete replacement.

        If you know of fewer than five ways to improve the performance of a system in which the ${functionName} function from the
        ${library} library is consuming significant CPU, then provide fewer than five suggestions. If you do not know of any
        way in which to improve the performance then say "I do not know how to improve the performance of systems where
        this function is consuming a significant amount of CPU".

        Do not suggest using a CPU profiler. I have already profiled my code. The profiler I used is Elastic Universal Profiler.
        If there is specific information I should look for in the profiler output then tell me what information to look for
        in the output of Elastic Universal Profiler.

        You must not include URLs, web addresses or websites of any kind in your output.

        If you have suggestions, the output format should look as follows:

        Here are some suggestions as to how you might optimize your system if ${functionName} in ${library} is consuming
        significant CPU resources:
        1. Insert first suggestion
        2. Insert second suggestion`,
      });
    }

    return undefined;
  }, [frame?.functionName, frame?.exeFileName, getContextualInsightMessages]);

  return (
    <>
      {ObservabilityAIAssistantContextualInsight && promptMessages ? (
        <ObservabilityAIAssistantContextualInsight
          messages={promptMessages}
          title={i18n.translate('xpack.profiling.frameInformationWindow.optimizeFunction', {
            defaultMessage: 'Optimize function',
          })}
        />
      ) : null}
    </>
  );
}
