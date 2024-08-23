/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PromptContext } from '@kbn/elastic-assistant';
import { useAssistantOverlay } from '@kbn/elastic-assistant';
import { useGetAssistantContext } from './use_get_assistant_context';

export interface UseAssistantResult {
  /**
   * Returns true if the assistant button is visible
   */
  showAssistant: boolean;
  /**
   * Function to show the assistant overlay
   */
  showAssistantOverlay: (show: boolean) => void;
  /**
   * The assistant prompt context
   */
  promptContext: PromptContext;
}

/**
 * Hook to use when setting up assistant context
 */
export const useAssistant = (): UseAssistantResult => {
  const { conversationTitle, conversationId, promptContext, showAssistant, isAssistantEnabled } =
    useGetAssistantContext();
  const { category, description, getPromptContext, id, suggestedUserPrompt, tooltip } =
    promptContext;

  const { showAssistantOverlay } = useAssistantOverlay(
    category,
    conversationTitle,
    description,
    getPromptContext,
    id,
    suggestedUserPrompt,
    tooltip,
    isAssistantEnabled,
    null,
    conversationId
  );

  return useMemo(
    () => ({
      showAssistant,
      showAssistantOverlay,
      promptContext,
    }),
    [showAssistant, showAssistantOverlay, promptContext]
  );
};
