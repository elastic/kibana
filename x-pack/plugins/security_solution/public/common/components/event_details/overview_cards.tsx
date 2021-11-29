/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
  EuiText,
  IconColor,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { find } from 'lodash/fp';

import type { BrowserFields } from '../../containers/source';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { ActionCell } from './table/action_cell';
import { EnrichedFieldInfo } from './types';
import { getEnrichedFieldInfo } from './helpers';
import {
  ALERTS_HEADERS_RISK_SCORE,
  ALERTS_HEADERS_RULE,
  ALERTS_HEADERS_SEVERITY,
  SIGNAL_STATUS,
} from '../../../detections/components/alerts_table/translations';
import {
  SIGNAL_RULE_NAME_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';

const OverviewPanel = euiStyled(EuiPanel)`
  &&& {
    background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
    max-height: 87px;
  }

  & {
    .hoverActions-active {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }

    &:hover {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }
  }
`;

interface OverviewCardProps {
  title: string;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ title, children }) => (
  <OverviewPanel borderRadius="none" hasShadow={false} hasBorder={false} paddingSize="s">
    <EuiText size="s">{title}</EuiText>
    <EuiSpacer size="s" />
    {children}
  </OverviewPanel>
);

OverviewCard.displayName = 'OverviewCard';

const ClampedContent = euiStyled.div`
  /* Clamp text content to 2 lines */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

ClampedContent.displayName = 'ClampedContent';

type OverviewCardWithActionsProps = OverviewCardProps & {
  contextId: string;
  enrichedFieldInfo: EnrichedFieldInfo;
};

export const OverviewCardWithActions: React.FC<OverviewCardWithActionsProps> = ({
  title,
  children,
  contextId,
  enrichedFieldInfo,
}) => {
  return (
    <OverviewCard title={title}>
      <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <ClampedContent>{children}</ClampedContent>
        </EuiFlexItem>
        <EuiFlexItem>
          <ActionCell {...enrichedFieldInfo} contextId={contextId} applyWidthAndPadding={false} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </OverviewCard>
  );
};

OverviewCardWithActions.displayName = 'OverviewCardWithActions';

// TODO: Ask design about other color maps
const SEVERITY_COLOR_MAP: Record<string, IconColor> = {
  low: 'subdued',
};

export const OverviewSeverity = React.memo<{ severity: string }>(({ severity }) => {
  const color: IconColor = SEVERITY_COLOR_MAP[severity] ?? 'default';
  return <EuiHealth color={color}>{severity}</EuiHealth>;
});

OverviewSeverity.displayName = 'OverviewSeverity';

// TODO: Ask design about other color maps
function riskScoreToColor(riskScore: string): IconColor {
  const riskScoreNumber = parseInt(riskScore, 10);
  if (riskScoreNumber > 99) {
    return 'danger';
  } else if (riskScoreNumber > 45) {
    return 'warning';
  }

  return 'subdued';
}

export const OverviewRiskScore = React.memo<{ riskScore: string }>(({ riskScore }) => {
  return <EuiHealth color={riskScoreToColor(riskScore)}>{riskScore}</EuiHealth>;
});

OverviewRiskScore.displayName = 'OverviewRiskScore';

export const NotGrowingFlexGroup = euiStyled(EuiFlexGroup)`
  flex-grow: 0;
`;

interface Props {
  browserFields: BrowserFields;
  contextId: string;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
}

export const OverviewCards = React.memo<Props>(
  ({ browserFields, contextId, data, eventId, timelineId }) => {
    const statusData = useMemo(() => {
      const item = find({ field: SIGNAL_STATUS_FIELD_NAME, category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          timelineId,
          browserFields,
          item,
        })
      );
    }, [browserFields, contextId, data, eventId, timelineId]);

    const severityData = useMemo(() => {
      const item = find({ field: 'kibana.alert.rule.severity', category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          timelineId,
          browserFields,
          item,
        })
      );
    }, [browserFields, contextId, data, eventId, timelineId]);

    const riskScoreData = useMemo(() => {
      const item = find({ field: 'kibana.alert.rule.risk_score', category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          timelineId,
          browserFields,
          item,
        })
      );
    }, [browserFields, contextId, data, eventId, timelineId]);

    const ruleNameData = useMemo(() => {
      const item = find({ field: SIGNAL_RULE_NAME_FIELD_NAME, category: 'kibana' }, data);
      const linkValueField = find({ field: 'kibana.alert.rule.uuid', category: 'kibana' }, data);
      return (
        item &&
        getEnrichedFieldInfo({
          eventId,
          contextId,
          timelineId,
          browserFields,
          item,
          linkValueField,
        })
      );
    }, [browserFields, contextId, data, eventId, timelineId]);

    return (
      <NotGrowingFlexGroup gutterSize="m">
        {hasData(statusData) && (
          <EuiFlexItem>
            <OverviewCard title={SIGNAL_STATUS}>
              <FormattedFieldValue
                contextId={contextId}
                eventId={eventId}
                value={statusData.values[0]}
                fieldName={statusData.data.field}
                linkValue={statusData.linkValue}
                fieldType={statusData.data.type}
                fieldFormat={statusData.data.format}
                isDraggable={false}
                truncate={false}
              />
            </OverviewCard>
          </EuiFlexItem>
        )}

        {hasData(severityData) && (
          <EuiFlexItem>
            <OverviewCardWithActions
              title={ALERTS_HEADERS_SEVERITY}
              enrichedFieldInfo={severityData}
              contextId={contextId}
            >
              <OverviewSeverity severity={severityData.values[0]} />
            </OverviewCardWithActions>
          </EuiFlexItem>
        )}

        {hasData(riskScoreData) && (
          <EuiFlexItem>
            <OverviewCardWithActions
              title={ALERTS_HEADERS_RISK_SCORE}
              enrichedFieldInfo={riskScoreData}
              contextId={contextId}
            >
              <OverviewRiskScore riskScore={riskScoreData.values[0]} />
            </OverviewCardWithActions>
          </EuiFlexItem>
        )}

        {hasData(ruleNameData) && (
          <EuiFlexItem>
            <OverviewCardWithActions
              title={ALERTS_HEADERS_RULE}
              enrichedFieldInfo={ruleNameData}
              contextId={contextId}
            >
              <FormattedFieldValue
                contextId={contextId}
                eventId={eventId}
                value={ruleNameData.values[0]}
                fieldName={ruleNameData.data.field}
                linkValue={ruleNameData.linkValue}
                fieldType={ruleNameData.data.type}
                fieldFormat={ruleNameData.data.format}
                isDraggable={false}
                truncate={false}
              />
            </OverviewCardWithActions>
          </EuiFlexItem>
        )}
      </NotGrowingFlexGroup>
    );
  }
);

type EnrichedDataWithValues = EnrichedFieldInfo & { values: string[] };

function hasData(fieldInfo?: EnrichedFieldInfo): fieldInfo is EnrichedDataWithValues {
  return !!fieldInfo && Array.isArray(fieldInfo.values);
}

OverviewCards.displayName = 'OverviewCards';
