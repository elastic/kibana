/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getUniquePromptContextId,
  useAssistantContextRegistry,
  useAssistantOverlay,
} from '@kbn/elastic-assistant';
import type { PromptContext } from '@kbn/elastic-assistant';
import type { ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';

import { useRulesTableContext } from '../../components/rules_table/rules_table/rules_table_context';
import { HeaderPage } from '../../../../common/components/header_page';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';

import { getPromptContextFromDetectionRules } from '../../../../assistant/helpers';

export const SuperHeader: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  const memoizedChildren = useMemo(() => children, [children]);
  // Rules state
  const {
    state: { rules, selectedRuleIds },
  } = useRulesTableContext();

  const selectedRules = useMemo(
    () => rules.filter((rule) => selectedRuleIds.includes(rule.id)),
    [rules, selectedRuleIds]
  );

  // Add Rules promptContext
  const promptContextId = useMemo(() => getUniquePromptContextId(), []);

  const { MagicButton } = useAssistantOverlay({
    conversationId: 'detectionRules',
    promptContextId: 'testing',
  });

  const getPromptContext = useCallback(
    async () => getPromptContextFromDetectionRules(selectedRules),
    [selectedRules]
  );

  const promptContext: PromptContext = useMemo(
    () => ({
      category: 'detection-rules',
      description: i18n.RULE_MANAGEMENT_CONTEXT_DESCRIPTION,
      id: promptContextId,
      getPromptContext,
      suggestedUserPrompt: i18n.EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS,
      tooltip: i18n.RULE_MANAGEMENT_CONTEXT_TOOLTIP,
    }),
    [getPromptContext, promptContextId]
  );

  useAssistantContextRegistry(promptContext);

  return (
    <HeaderPage
      title={
        <>
          {i18n.PAGE_TITLE} {MagicButton}
        </>
      }
    >
      {memoizedChildren}
    </HeaderPage>
  );
});

SuperHeader.displayName = 'NewChatComponent';
