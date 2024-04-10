/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { ObservabilityLogsAIAssistantFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';
import { LogAIAssistantDocument, LogAIAssistantProps } from './log_ai_assistant';

export const LogAIAssistant = dynamic(() => import('./log_ai_assistant'));

export function createLogAIAssistant({
  observabilityAIAssistant,
}: Pick<LogAIAssistantProps, 'observabilityAIAssistant'>) {
  return (props: Omit<LogAIAssistantProps, 'observabilityAIAssistant'>) => (
    <LogAIAssistant observabilityAIAssistant={observabilityAIAssistant} {...props} />
  );
}

export const createLogsAIAssistantRenderer =
  (LogAIAssistantRender: ReturnType<typeof createLogAIAssistant>) =>
  ({ doc }: ObservabilityLogsAIAssistantFeatureRenderDeps) => {
    if (!doc) return;

    const mappedDoc = useMemo(
      () => ({
        fields: Object.entries(doc.flattened).map(([field, value]) => ({
          field,
          value,
        })) as LogAIAssistantDocument['fields'],
      }),
      [doc]
    );

    return <LogAIAssistantRender key={doc.id} doc={mappedDoc} />;
  };
