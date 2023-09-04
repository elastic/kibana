/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ContextualInsight,
  Message,
  MessageRole,
  useObservabilityAIAssistant,
} from '@kbn/observability-ai-assistant-plugin/public';
import React, { useMemo } from 'react';
import {
  FrameSymbolStatus,
  getFrameSymbolStatus,
} from '@kbn/profiling-data-access-plugin/common/profiling';
import { FrameInformationPanel } from './frame_information_panel';
import { getImpactRows } from './get_impact_rows';
import { getInformationRows } from './get_information_rows';
import { KeyValueList } from './key_value_list';
import { MissingSymbolsCallout } from './missing_symbols_callout';

export interface Props {
  frame?: {
    fileID: string;
    frameType: number;
    exeFileName: string;
    addressOrLine: number;
    functionName: string;
    sourceFileName: string;
    sourceLine: number;
    countInclusive: number;
    countExclusive: number;
  };
  totalSamples: number;
  totalSeconds: number;
}

export function FrameInformationWindow({ frame, totalSamples, totalSeconds }: Props) {
  const aiAssistant = useObservabilityAIAssistant();

  const promptMessages = useMemo<Message[] | undefined>(() => {
    if (frame?.functionName && frame.exeFileName) {
      const functionName = frame.functionName;
      const library = frame.exeFileName;

      const now = new Date().toISOString();

      return [
        {
          '@timestamp': now,
          message: {
            role: MessageRole.System,
            content: `You are perf-gpt, a helpful assistant for performance analysis and optimisation
            of software. Answer as concisely as possible.`,
          },
        },
        {
          '@timestamp': now,
          message: {
            role: MessageRole.User,
            content: `I am a software engineer. I am trying to understand what a function in a particular
            software library does.
            
            The library is: ${library}
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
          },
        },
      ];
    }

    return undefined;
  }, [frame?.functionName, frame?.exeFileName]);

  if (!frame) {
    return (
      <FrameInformationPanel>
        <EuiText>
          {i18n.translate('xpack.profiling.frameInformationWindow.selectFrame', {
            defaultMessage: 'Click on a frame to display more information',
          })}
        </EuiText>
      </FrameInformationPanel>
    );
  }

  const symbolStatus = getFrameSymbolStatus({
    sourceFilename: frame.sourceFileName,
    sourceLine: frame.sourceLine,
    exeFileName: frame.exeFileName,
  });

  const {
    fileID,
    frameType,
    exeFileName,
    addressOrLine,
    functionName,
    sourceFileName,
    sourceLine,
    countInclusive,
    countExclusive,
  } = frame;

  const informationRows = getInformationRows({
    fileID,
    frameType,
    exeFileName,
    addressOrLine,
    functionName,
    sourceFileName,
    sourceLine,
  });

  const impactRows = getImpactRows({
    countInclusive,
    countExclusive,
    totalSamples,
    totalSeconds,
  });

  return (
    <FrameInformationPanel>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <KeyValueList data-test-subj="informationRows" rows={informationRows} />
        </EuiFlexItem>
        {aiAssistant.isEnabled() && promptMessages ? (
          <>
            <EuiFlexItem>
              <ContextualInsight
                messages={promptMessages}
                title={i18n.translate('xpack.profiling.frameInformationWindow.optimizeFunction', {
                  defaultMessage: 'Optimize function',
                })}
              />
            </EuiFlexItem>
          </>
        ) : undefined}
        {symbolStatus !== FrameSymbolStatus.SYMBOLIZED && (
          <EuiFlexItem>
            <MissingSymbolsCallout frameType={frame.frameType} />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h2>
                  {i18n.translate('xpack.profiling.frameInformationWindow.impactEstimatesTitle', {
                    defaultMessage: 'Impact estimates',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <KeyValueList data-test-subj="impactEstimates" rows={impactRows} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FrameInformationPanel>
  );
}
