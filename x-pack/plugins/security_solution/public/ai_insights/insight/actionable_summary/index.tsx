/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';

import { InsightMarkdownFormatter } from '../../insight_markdown_formatter';
import type { AlertsInsight } from '../../types';
import { ViewInAiAssistant } from '../view_in_ai_assistant';

interface Props {
  insight: AlertsInsight;
  promptContextId: string | undefined;
  replacements?: Record<string, string>;
  showAnonymized?: boolean;
}

const ActionableSummaryComponent: React.FC<Props> = ({
  insight,
  promptContextId,
  replacements,
  showAnonymized = false,
}) => {
  const entitySummaryMarkdownWithReplacements = useMemo(
    () =>
      Object.entries(replacements ?? {}).reduce(
        (acc, [key, value]) => acc.replace(key, value),
        insight.entitySummaryMarkdown
      ),
    [insight.entitySummaryMarkdown, replacements]
  );

  return (
    <EuiPanel color="subdued" data-test-subj="actionableSummary">
      <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem data-test-subj="entitySummaryMarkdown" grow={false}>
          <InsightMarkdownFormatter
            disableActions={showAnonymized}
            markdown={
              showAnonymized ? insight.entitySummaryMarkdown : entitySummaryMarkdownWithReplacements
            }
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <ViewInAiAssistant
            compact={true}
            conversationTitle={insight.title}
            promptContextId={promptContextId}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ActionableSummaryComponent.displayName = 'ActionableSummary';

export const ActionableSummary = React.memo(ActionableSummaryComponent);
