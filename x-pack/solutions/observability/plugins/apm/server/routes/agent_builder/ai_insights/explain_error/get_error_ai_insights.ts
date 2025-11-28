/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MessageRole, type InferenceClient } from '@kbn/inference-common';
import { safeJsonStringify } from '@kbn/std';
import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { getErrorContext } from './get_error_context';
import { parseDatemath } from '../../../../agent_builder/utils/time';

export interface GetErrorAiInsightsParams {
  apmEventClient: APMEventClient;
  serviceName: string;
  errorId: string;
  start: string;
  end: string;
  environment: string;
  kuery: string;
  inferenceClient: InferenceClient;
  connectorId: string;
}

export async function getErrorAiInsights({
  apmEventClient,
  serviceName,
  errorId,
  start,
  end,
  environment,
  kuery,
  inferenceClient,
  connectorId,
}: GetErrorAiInsightsParams): Promise<{ context: string; summary: string }> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);

  const { errorData } = await getErrorContext({
    apmEventClient,
    serviceName,
    errorId,
    start: startMs,
    end: endMs,
    environment,
    kuery,
  });

  const ctxServiceName: string = errorData?.error?.service?.name ?? '';
  const languageName: string = errorData?.error?.service?.language?.name ?? '';
  const runtimeName: string = errorData?.error?.service?.runtime?.name ?? '';
  const runtimeVersion: string = errorData?.error?.service?.runtime?.version ?? '';
  const transactionName: string = errorData?.transaction?.transaction?.name ?? '';

  const logStacktrace: string = errorData?.error?.error?.log?.message ?? '';

  const exceptionStacktrace: string =
    Array.isArray(errorData?.error?.error?.exception) && errorData.error.error.exception.length > 0
      ? errorData.error.error.exception
          .map((ex: any) => ex?.message || ex?.type || '')
          .filter(Boolean)
          .join('\n')
      : '';

  const instructions = [
    `I'm an SRE. I am looking at an exception and trying to understand what it means.`,
    `Your task is to describe what the error means and what it could be caused by.`,
    `The error occurred on a service called ${ctxServiceName}, which is a ${runtimeName} service written in ${languageName}. The`,
    `runtime version is ${runtimeVersion}.`,
    `The request it occurred for is called ${transactionName}.`,
    logStacktrace ? `The log stacktrace:\n${logStacktrace}` : '',
    exceptionStacktrace ? `The exception stacktrace:\n${exceptionStacktrace}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  // TODO: add system prompt
  const response = await inferenceClient.chatComplete({
    connectorId,
    messages: [
      {
        role: MessageRole.User,
        content: instructions,
      },
    ],
    functionCalling: 'auto',
  });

  let content = '';
  if (response && typeof (response as any).content === 'string') {
    content = (response as any).content;
  }

  return { context: safeJsonStringify(errorData) ?? '', summary: content };
}
