/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { find } from 'lodash/fp';
import type { EuiFlexItemProps } from '@elastic/eui/src/components/flex/flex_item';
import {
  ALERT_RISK_SCORE,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
  KIBANA_NAMESPACE,
} from '@kbn/rule-data-utils';
import type { SearchHit } from '../../../../../../../common/search_strategy';
import { TimelineId } from '../../../../../../../common/types';
import { SeverityBadge } from '../../../../../components/rules/severity_badge';
import { getEnrichedFieldInfo } from '../../../../../../common/components/event_details/helpers';
import type { SelectedDataView } from '../../../../../../common/store/sourcerer/model';
import { FormattedFieldValue } from '../../../../../../timelines/components/timeline/body/renderers/formatted_field';
import {
  RISK_SCORE_TITLE,
  RULE_DESCRIPTION_TITLE,
  RULE_NAME_TITLE,
  RULE_PANEL_TITLE,
  SEVERITY_TITLE,
} from '../translation';
import { getMitreComponentParts } from '../../../../../mitre/get_mitre_threat_component';
import { getTimelineEventData } from '../../../utils/get_timeline_event_data';
import { SummaryPanel } from '../wrappers';
import { RulePanelActions, RULE_PANEL_ACTIONS_CLASS } from './rule_panel_actions';

export interface RulePanelProps {
  data: TimelineEventsDetailsItem[];
  id: string;
  browserFields: SelectedDataView['browserFields'];
  searchHit?: SearchHit;
}

const threatTacticContainerStyles = css`
  flex-wrap: nowrap;
  & .euiFlexGroup {
    flex-wrap: nowrap;
  }
`;

interface RuleSectionProps {
  ['data-test-subj']?: string;
  title: string;
  grow?: EuiFlexItemProps['grow'];
}
const RuleSection: React.FC<RuleSectionProps> = ({
  grow,
  title,
  children,
  'data-test-subj': dataTestSubj,
}) => (
  <EuiFlexItem grow={grow} data-test-subj={dataTestSubj}>
    <EuiTitle size="xxs">
      <h5>{title}</h5>
    </EuiTitle>
    <EuiSpacer size="xs" />
    {children}
  </EuiFlexItem>
);

export const RulePanel = React.memo(({ data, id, searchHit, browserFields }: RulePanelProps) => {
  const ruleUuid = useMemo(() => getTimelineEventData(ALERT_RULE_UUID, data), [data]);
  const threatDetails = useMemo(() => getMitreComponentParts(searchHit), [searchHit]);
  const alertRiskScore = useMemo(() => getTimelineEventData(ALERT_RISK_SCORE, data), [data]);
  const alertSeverity = useMemo(
    () => getTimelineEventData(ALERT_SEVERITY, data) as Severity,
    [data]
  );
  const alertRuleDescription = useMemo(
    () => getTimelineEventData(ALERT_RULE_DESCRIPTION, data),
    [data]
  );
  const shouldShowThreatDetails = !!threatDetails && threatDetails?.length > 0;

  const renderRuleActions = useCallback(() => <RulePanelActions ruleUuid={ruleUuid} />, [ruleUuid]);
  const ruleNameData = useMemo(() => {
    const item = find({ field: ALERT_RULE_NAME, category: KIBANA_NAMESPACE }, data);
    const linkValueField = find({ field: ALERT_RULE_UUID, category: KIBANA_NAMESPACE }, data);
    return (
      item &&
      getEnrichedFieldInfo({
        eventId: id,
        contextId: TimelineId.detectionsAlertDetailsPage,
        scopeId: TimelineId.detectionsAlertDetailsPage,
        browserFields,
        item,
        linkValueField,
      })
    );
  }, [browserFields, data, id]);

  return (
    <SummaryPanel
      actionsClassName={RULE_PANEL_ACTIONS_CLASS}
      renderActionsPopover={renderRuleActions}
      title={RULE_PANEL_TITLE}
    >
      <EuiFlexGroup data-test-subj="rule-panel">
        <EuiFlexItem grow={2}>
          <EuiFlexGroup>
            <RuleSection title={RULE_NAME_TITLE} grow={2}>
              <FormattedFieldValue
                contextId={TimelineId.active}
                eventId={id}
                value={ruleNameData?.values?.[0]}
                fieldName={ruleNameData?.data.field ?? ''}
                linkValue={ruleNameData?.linkValue}
                fieldType={ruleNameData?.data.type}
                fieldFormat={ruleNameData?.data.format}
                isDraggable={false}
                truncate={false}
              />
            </RuleSection>
            <RuleSection title={RISK_SCORE_TITLE}>{alertRiskScore}</RuleSection>
            <RuleSection data-test-subj="rule-panel-severity" title={SEVERITY_TITLE}>
              <SeverityBadge value={alertSeverity} />
            </RuleSection>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <RuleSection title={RULE_DESCRIPTION_TITLE} grow={2}>
              {alertRuleDescription}
            </RuleSection>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup
            data-test-subj="rule-panel-threat-tactic"
            wrap={false}
            css={threatTacticContainerStyles}
          >
            {shouldShowThreatDetails && (
              <RuleSection title={threatDetails[0].title as string} grow={2}>
                {threatDetails[0].description}
              </RuleSection>
            )}
          </EuiFlexGroup>
          <EuiSpacer />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SummaryPanel>
  );
});

RulePanel.displayName = 'RulePanel';
