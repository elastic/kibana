/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import { sortBy } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import type { PromptContext } from '../prompt_context/types';

interface Props {
  isNewChat: boolean;
  onSendContextMessage: (content: string) => void;
  promptContexts: Record<string, PromptContext>;
  selectedPromptContextIds: string[];
  setSelectedPromptContextIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const ContextPillsComponent: React.FC<Props> = ({
  isNewChat,
  onSendContextMessage,
  promptContexts,
  selectedPromptContextIds,
  setSelectedPromptContextIds,
}) => {
  const sortedPromptContexts = useMemo(
    () => sortBy('description', Object.values(promptContexts)),
    [promptContexts]
  );

  const selectPromptContext = useCallback(
    (id: string) => {
      if (!selectedPromptContextIds.includes(id)) {
        setSelectedPromptContextIds((prev) => [...prev, id]);
      }
    },
    [selectedPromptContextIds, setSelectedPromptContextIds]
  );

  const selectAndSendContextMessage = useCallback(
    async (id: string) => {
      const promptContext: PromptContext | undefined = promptContexts[id];
      if (promptContext != null) {
        if (!selectedPromptContextIds.includes(id)) {
          setSelectedPromptContextIds((prev) => [...prev, id]);
        }

        const content = await promptContext.getPromptContext();
        onSendContextMessage(content);
      }
    },
    [onSendContextMessage, promptContexts, selectedPromptContextIds, setSelectedPromptContextIds]
  );

  return (
    <EuiFlexGroup gutterSize="none" wrap>
      {sortedPromptContexts.map(({ description, id, getPromptContext, tooltip }) => (
        <EuiFlexItem grow={false} key={id}>
          <EuiToolTip content={tooltip}>
            <EuiButton
              disabled={selectedPromptContextIds.includes(id)}
              iconSide="left"
              iconType="plus"
              onClick={() =>
                isNewChat ? selectPromptContext(id) : selectAndSendContextMessage(id)
              }
            >
              {description}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const ContextPills = React.memo(ContextPillsComponent);
