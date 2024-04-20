/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiAccordion, EuiPanel, EuiSpacer, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { useAssistantOverlay } from '@kbn/elastic-assistant';
import type { Replacements } from '@kbn/elastic-assistant-common';
import React, { useCallback, useMemo, useState } from 'react';

import { ActionableSummary } from './actionable_summary';
import { Actions } from './actions';
import { useAssistantAvailability } from '../../assistant/use_assistant_availability';
import { getAlertsInsightMarkdown } from '../get_alerts_insight_markdown/get_alerts_insight_markdown';
import { Tabs } from './tabs';
import { Title } from './title';
import type { AlertsInsight } from '../types';

const useAssistantNoop = () => ({ promptContextId: undefined });

/**
 * This category is provided in the prompt context for the assistant
 */
const category = 'insight';

interface Props {
  initialIsOpen?: boolean;
  insight: AlertsInsight;
  onToggle?: (newState: 'open' | 'closed') => void;
  replacements?: Replacements;
  showAnonymized?: boolean;
}

const InsightComponent = (
  {
    initialIsOpen,
    insight,
    onToggle,
    replacements,
    showAnonymized = false
  }: Props
) => {
  const { euiTheme } = useEuiTheme();

  // get assistant privileges:
  const { hasAssistantPrivilege } = useAssistantAvailability();
  const useAssistantHook = useMemo(
    () => (hasAssistantPrivilege ? useAssistantOverlay : useAssistantNoop),
    [hasAssistantPrivilege]
  );

  // the prompt context for this insight:
  const getPromptContext = useCallback(
    async () =>
      getAlertsInsightMarkdown({
        insight,
        // note: we do NOT want to replace the replacements here
      }),
    [insight]
  );
  const { promptContextId } = useAssistantHook(
    category,
    insight.title, // conversation title
    insight.title, // description used in context pill
    getPromptContext,
    null, // accept the UUID default for this prompt context
    null, // suggestedUserPrompt
    null, // tooltip
    replacements ?? null
  );

  const htmlId = useGeneratedHtmlId({
    prefix: 'insightAccordion',
  });
  const [isOpen, setIsOpen] = useState<'open' | 'closed'>(initialIsOpen ? 'open' : 'closed');
  const updateIsOpen = useCallback(() => {
    const newState = isOpen === 'open' ? 'closed' : 'open';

    setIsOpen(newState);
    onToggle?.(newState);
  }, [isOpen, onToggle]);

  const actions = useMemo(
    () => (
      <Actions insight={insight} promptContextId={promptContextId} replacements={replacements} />
    ),
    [insight, promptContextId, replacements]
  );

  const buttonContent = useMemo(
    () => <Title isLoading={false} title={insight.title} />,
    [insight.title]
  );

  return (
    <>
      <EuiPanel data-test-subj="insight" hasBorder={true}>
        <EuiAccordion
          buttonContent={buttonContent}
          data-test-subj="insightAccordion"
          extraAction={actions}
          forceState={isOpen}
          id={htmlId}
          onToggle={updateIsOpen}
        >
          <span data-test-subj="emptyAccordionContent" />
        </EuiAccordion>

        <EuiSpacer size="m" />

        <ActionableSummary
          insight={insight}
          promptContextId={promptContextId}
          replacements={replacements}
          showAnonymized={showAnonymized}
        />
      </EuiPanel>

      {isOpen === 'open' && (
        <EuiPanel
          css={css`
            border-top: none;
            border-radius: 0 0 6px 6px;
            margin: 0 ${euiTheme.size.m} 0 ${euiTheme.size.m};
          `}
          data-test-subj="insightTabsPanel"
          hasBorder={true}
        >
          <Tabs
            insight={insight}
            promptContextId={promptContextId}
            replacements={replacements}
            showAnonymized={showAnonymized}
          />
        </EuiPanel>
      )}
    </>
  );
};

InsightComponent.displayName = 'Insight';

export const Insight = React.memo(InsightComponent);
