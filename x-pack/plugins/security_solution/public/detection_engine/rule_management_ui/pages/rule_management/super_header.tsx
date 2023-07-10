/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewChat } from '@kbn/elastic-assistant';
import React, { useCallback, useMemo } from 'react';

import { getPromptContextFromDetectionRules } from '../../../../assistant/helpers';
import { HeaderPage } from '../../../../common/components/header_page';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useRulesTableContext } from '../../components/rules_table/rules_table/rules_table_context';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';

export const SuperHeader: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const isAssistantEnabled = useIsExperimentalFeatureEnabled('assistantEnabled');
  const memoizedChildren = useMemo(() => children, [children]);
  // Rules state
  const {
    state: { rules, selectedRuleIds },
  } = useRulesTableContext();

  const selectedRules = useMemo(
    () => rules.filter((rule) => selectedRuleIds.includes(rule.id)),
    [rules, selectedRuleIds]
  );

  const getPromptContext = useCallback(
    async () => getPromptContextFromDetectionRules(selectedRules),
    [selectedRules]
  );

  return (
    <HeaderPage
      title={
        <>
          {i18n.PAGE_TITLE}{' '}
          {isAssistantEnabled && selectedRules.length > 0 && (
            <NewChat
              category="detection-rules"
              conversationId={i18n.DETECTION_RULES_CONVERSATION_ID}
              description={i18n.RULE_MANAGEMENT_CONTEXT_DESCRIPTION}
              getPromptContext={getPromptContext}
              iconType={null}
              suggestedUserPrompt={i18n.EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS}
              tooltip={i18n.RULE_MANAGEMENT_CONTEXT_TOOLTIP}
            >
              {'🪄✨'}
            </NewChat>
          )}
        </>
      }
    >
      {memoizedChildren}
    </HeaderPage>
  );
});

SuperHeader.displayName = 'NewChatComponent';
