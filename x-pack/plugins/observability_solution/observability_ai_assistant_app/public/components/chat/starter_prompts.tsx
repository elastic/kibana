/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import { useObservabilityAIAssistantAppService } from '../../hooks/use_observability_ai_assistant_app_service';
import { nonNullable } from '../../utils/non_nullable';

const starterPromptClassName = css`
  max-width: 50%;
  min-width: calc(50% - 8px);
`;

export function StarterPrompts({
  userPrompts,
  onSelectPrompt,
}: {
  userPrompts: string[];
  onSelectPrompt: (prompt: string) => void;
}) {
  const service = useObservabilityAIAssistantAppService();

  const starterPrompts = useMemo(
    () => [
      ...new Set(
        service
          .getScreenContexts()
          .reverse()
          .flatMap((context) => context.starterPrompts)
          .filter(nonNullable)
          .filter((prompt) => !userPrompts.includes(prompt))
          .slice(0, 4)
      ),
    ],
    [service, userPrompts]
  );

  const handleSelectPrompt = (prompt: string) => {
    onSelectPrompt(prompt);
  };

  return (
    <EuiFlexGroup direction="row" gutterSize="m" wrap>
      {starterPrompts.map((prompt) => (
        <EuiFlexItem key={prompt} className={starterPromptClassName}>
          <EuiPanel paddingSize="s" onClick={() => handleSelectPrompt(prompt)}>
            {prompt}
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
