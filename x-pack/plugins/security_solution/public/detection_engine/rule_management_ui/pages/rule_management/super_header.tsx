/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MagicButton } from '@kbn/elastic-assistant';
import React, { useCallback, useMemo } from 'react';

import { useRulesTableContext } from '../../components/rules_table/rules_table/rules_table_context';
import { HeaderPage } from '../../../../common/components/header_page';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';

import { getPromptContextFromDetectionRules } from '../../../../assistant/helpers';

export const SuperHeader: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
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
          {selectedRules.length > 0 && (
            <MagicButton
              conversationId="detectionRules"
              promptContext={{
                category: 'detection-rules',
                description: i18n.RULE_MANAGEMENT_CONTEXT_DESCRIPTION,
                getPromptContext,
                suggestedUserPrompt: i18n.EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS,
                tooltip: i18n.RULE_MANAGEMENT_CONTEXT_TOOLTIP,
              }}
            />
          )}
        </>
      }
    >
      {memoizedChildren}
    </HeaderPage>
  );
});

SuperHeader.displayName = 'NewChatComponent';
