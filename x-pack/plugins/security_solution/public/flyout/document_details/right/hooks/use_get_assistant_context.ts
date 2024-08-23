/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptContext } from '@kbn/elastic-assistant';
import { useCallback, useMemo } from 'react';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { getRawData } from '../../../../assistant/helpers';
import {
  ALERT_SUMMARY_CONTEXT_DESCRIPTION,
  ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  EVENT_SUMMARY_CONTEXT_DESCRIPTION,
  EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  SUMMARY_VIEW,
} from '../../../../common/components/event_details/translations';
import {
  ALERT_SUMMARIZATION_PROMPT,
  EVENT_SUMMARIZATION_PROMPT,
} from '../../../../assistant/content/quick_prompts/translations';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { useDocumentDetailsContext } from '../../shared/context';

const ALERT_CONTEXTS = {
  category: 'alert',
  titlePrefix: 'Alert',
  description: ALERT_SUMMARY_CONTEXT_DESCRIPTION(SUMMARY_VIEW),
  tooltip: ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
};

const EVENT_CONTEXTS = {
  category: 'event',
  titlePrefix: 'Event',
  description: EVENT_SUMMARY_CONTEXT_DESCRIPTION(SUMMARY_VIEW),
  tooltip: EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
};

const getPromptContextByType = (isAlert: boolean, type?: string) => {
  if (type === 'investigation') {
    return {
      ...ALERT_CONTEXTS,
      suggestedUserPrompt: 'Create an investigation guide for this alert',
    };
  }
  if (type === 'summary') {
    if (isAlert) {
      return {
        ...ALERT_CONTEXTS,
        suggestedUserPrompt: ALERT_SUMMARIZATION_PROMPT,
      };
    } else {
      return {
        ...EVENT_CONTEXTS,
        suggestedUserPrompt: EVENT_SUMMARIZATION_PROMPT,
      };
    }
  }
  return isAlert ? ALERT_CONTEXTS : EVENT_CONTEXTS;
};

export type PromptType = 'summary' | 'investigation';

export interface UseGetAssistantContextResult {
  /**
   * Returns true if the assistant button is visible
   */
  showAssistant: boolean;
  /**
   * Returns true if the assistant is enabled
   */
  isAssistantEnabled: boolean;
  /**
   * The conversation title for the assistant context
   */
  conversationTitle: string;
  /**
   * The conversation ID for the assistant context
   */
  conversationId: string;
  /**
   * The assistant prompt context
   */
  promptContext: PromptContext;
}

/*
 * This hook is used to get the assistant context for the document details flyout.
 */
export const useGetAssistantContext = (type?: PromptType): UseGetAssistantContextResult => {
  const { dataFormattedForFieldBrowser, eventId } = useDocumentDetailsContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();
  const getPromptContext = useCallback(
    async () => getRawData(dataFormattedForFieldBrowser ?? []),
    [dataFormattedForFieldBrowser]
  );

  const promptContext = getPromptContextByType(isAlert, type);

  return useMemo(
    () => ({
      isAssistantEnabled,
      showAssistant: hasAssistantPrivilege && isAssistantEnabled,
      conversationTitle: `${promptContext.titlePrefix}-${eventId}`,
      conversationId: eventId,
      promptContext: {
        ...promptContext,
        id: eventId,
        getPromptContext,
      },
    }),
    [promptContext, eventId, getPromptContext, hasAssistantPrivilege, isAssistantEnabled]
  );
};
