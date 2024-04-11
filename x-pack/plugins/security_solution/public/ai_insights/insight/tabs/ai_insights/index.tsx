/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

// import { SendToTimelineButton } from '../../../../assistant/send_to_timeline';
import { AttackChain } from '../../../attack/attack_chain';
import { InvestigateInTimelineButton } from '../../../../common/components/event_details/table/investigate_in_timeline_button';
import { buildAlertsKqlFilter } from '../../../../detections/components/alerts_table/actions';
import { getTacticMetadata } from '../../../helpers';
import { InsightMarkdownFormatter } from '../../../insight_markdown_formatter';
import * as i18n from './translations';
import type { AlertsInsight } from '../../../types';
import { ViewInAiAssistant } from '../../view_in_ai_assistant';

interface Props {
  insight: AlertsInsight;
  promptContextId: string | undefined;
  replacements?: Record<string, string>;
  showAnonymized?: boolean;
}

const AiInsightsComponent: React.FC<Props> = ({
  insight,
  promptContextId,
  replacements,
  showAnonymized = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const { detailsMarkdown, summaryMarkdown } = useMemo(() => insight, [insight]);

  const summaryMarkdownWithReplacements = useMemo(
    () =>
      Object.entries<string>(replacements ?? {}).reduce(
        (acc, [key, value]) => acc.replace(key, value),
        summaryMarkdown
      ),
    [replacements, summaryMarkdown]
  );

  const detailsMarkdownWithReplacements = useMemo(
    () =>
      Object.entries<string>(replacements ?? {}).reduce(
        (acc, [key, value]) => acc.replace(key, value),
        detailsMarkdown
      ),
    [detailsMarkdown, replacements]
  );

  const tacticMetadata = useMemo(() => getTacticMetadata(insight), [insight]);

  const originalAlertIds = useMemo(
    () => insight.alertIds.map((id) => replacements?.[id] ?? id),
    [insight.alertIds, replacements]
  );

  const filters = useMemo(() => buildAlertsKqlFilter('_id', originalAlertIds), [originalAlertIds]);

  return (
    <div data-test-subj="aiInsightsTab">
      <EuiTitle data-test-subj="summaryTitle" size="xs">
        <h2>{i18n.SUMMARY}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <InsightMarkdownFormatter
        disableActions={showAnonymized}
        markdown={showAnonymized ? summaryMarkdown : summaryMarkdownWithReplacements}
      />

      <EuiSpacer />

      <EuiTitle data-test-subj="detailsTitle" size="xs">
        <h2>{i18n.DETAILS}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <InsightMarkdownFormatter
        disableActions={showAnonymized}
        markdown={showAnonymized ? detailsMarkdown : detailsMarkdownWithReplacements}
      />

      <EuiSpacer />

      {tacticMetadata.length > 0 && (
        <>
          <EuiTitle data-test-subj="detailsTitle" size="xs">
            <h2>{i18n.ATTACK_CHAIN}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <AttackChain insight={insight} />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <ViewInAiAssistant conversationTitle={insight.title} promptContextId={promptContextId} />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            margin-left: ${euiTheme.size.m};
            margin-top: ${euiTheme.size.xs};
          `}
          grow={false}
        >
          <InvestigateInTimelineButton asEmptyButton={true} dataProviders={null} filters={filters}>
            <EuiFlexGroup
              alignItems="center"
              data-test-subj="investigateInTimelineButton"
              gutterSize="xs"
            >
              <EuiFlexItem grow={false}>
                <EuiIcon data-test-subj="timelineIcon" type="timeline" />
              </EuiFlexItem>
              <EuiFlexItem data-test-subj="investigateInTimelineLabel" grow={false}>
                {i18n.INVESTIGATE_IN_TIMELINE}
              </EuiFlexItem>
            </EuiFlexGroup>
          </InvestigateInTimelineButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </div>
  );
};

AiInsightsComponent.displayName = 'AiInsights';

export const AiInsights = React.memo(AiInsightsComponent);
