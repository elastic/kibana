/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { uniq } from 'lodash';
import { useObservabilityAIAssistantAppService } from '../../hooks/use_observability_ai_assistant_app_service';
import { nonNullable } from '../../utils/non_nullable';

const starterPromptClassName = css`
  max-width: 50%;
  min-width: calc(50% - 8px);
`;

const starterPromptInnerClassName = css`
  text-align: center !important;
`;

export function StarterPrompts({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  const service = useObservabilityAIAssistantAppService();

  const contexts = service.getScreenContexts();

  const starterPrompts = uniq(
    [...contexts]
      .reverse()
      .flatMap((context) => context.starterPrompts)
      .filter(nonNullable)
      .slice(-4)
  );

  return (
    <EuiFlexGroup direction="row" gutterSize="m" wrap>
      {starterPrompts.map(({ prompt, title, icon }) => (
        <EuiFlexItem key={prompt} className={starterPromptClassName}>
          <EuiPanel
            paddingSize="m"
            hasShadow={false}
            hasBorder
            onClick={() => onSelectPrompt(prompt)}
            className={starterPromptInnerClassName}
          >
            <EuiSpacer size="s" />
            <EuiIcon type={icon} size="xl" />
            <EuiSpacer size="s" />
            <EuiTitle size="xs">
              <h2>{title}</h2>
            </EuiTitle>
            <EuiText size="s">{prompt}</EuiText>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
