/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { EuiTitle, EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { HostRisk, UserRisk } from '../../../../entity_analytics/api/types';
import * as i18n from './translations';
import type { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';

import type {
  BrowserFields,
  TimelineEventsDetailsItem,
  RiskSeverity,
} from '../../../../../common/search_strategy';
import { RiskSummaryPanel } from '../../../../entity_analytics/components/risk_summary_panel';
import { EnrichmentSummary } from './enrichment_summary';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useHasSecurityCapability } from '../../../../helper_hooks';
import { RiskScoreInfoTooltip } from '../../../../overview/components/common';

const UppercaseEuiTitle = styled(EuiTitle)`
  text-transform: uppercase;
`;

const ThreatSummaryPanelTitle: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <UppercaseEuiTitle size="xxxs">
    <h5>{children}</h5>
  </UppercaseEuiTitle>
);

const StyledEnrichmentFieldTitle = styled(EuiTitle)`
  width: 220px;
`;

const EnrichmentFieldTitle: React.FC<{
  title: string | React.ReactNode | undefined;
}> = ({ title }) => (
  <StyledEnrichmentFieldTitle size="xxxs">
    <h6>{title}</h6>
  </StyledEnrichmentFieldTitle>
);

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  margin-top: ${({ theme }) => theme.eui.euiSizeS};
`;

export const EnrichedDataRow: React.FC<{
  field: string | React.ReactNode | undefined;
  value: React.ReactNode;
}> = ({ field, value }) => (
  <StyledEuiFlexGroup
    direction="row"
    gutterSize="none"
    responsive
    alignItems="center"
    data-test-subj="EnrichedDataRow"
  >
    <EuiFlexItem style={{ flexShrink: 0 }} grow={false}>
      <EnrichmentFieldTitle title={field} />
    </EuiFlexItem>
    <EuiFlexItem className="eui-textBreakWord">{value}</EuiFlexItem>
  </StyledEuiFlexGroup>
);

export const ThreatSummaryPanelHeader: React.FC<{
  title: string | React.ReactNode;
  toolTipContent: React.ReactNode;
  toolTipTitle?: React.ReactNode;
}> = ({ title, toolTipContent, toolTipTitle }) => {
  return (
    <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
      <EuiFlexItem>
        <ThreatSummaryPanelTitle>{title}</ThreatSummaryPanelTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RiskScoreInfoTooltip
          toolTipContent={toolTipContent}
          toolTipTitle={toolTipTitle ?? title}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ThreatSummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  enrichments: CtiEnrichment[];
  eventId: string;
  scopeId: string;
  hostRisk: HostRisk;
  userRisk: UserRisk;
  isDraggable?: boolean;
  isReadOnly?: boolean;
}> = ({
  browserFields,
  data,
  enrichments,
  eventId,
  scopeId,
  hostRisk,
  userRisk,
  isDraggable,
  isReadOnly,
}) => {
  const originalHostRisk = data?.find(
    (eventDetail) => eventDetail?.field === 'host.risk.calculated_level'
  )?.values?.[0] as RiskSeverity | undefined;

  const originalUserRisk = data?.find(
    (eventDetail) => eventDetail?.field === 'user.risk.calculated_level'
  )?.values?.[0] as RiskSeverity | undefined;

  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');

  if (!hasEntityAnalyticsCapability && enrichments.length === 0) {
    return null;
  }

  return (
    <>
      <EuiHorizontalRule />

      <EuiTitle size="xxxs">
        <h5>{i18n.ENRICHED_DATA}</h5>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="m" style={{ flexGrow: 0 }}>
        {hasEntityAnalyticsCapability && (
          <>
            <EuiFlexItem grow={false}>
              <RiskSummaryPanel
                riskEntity={RiskScoreEntity.host}
                risk={hostRisk}
                originalRisk={originalHostRisk}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <RiskSummaryPanel
                riskEntity={RiskScoreEntity.user}
                risk={userRisk}
                originalRisk={originalUserRisk}
              />
            </EuiFlexItem>
          </>
        )}

        <EnrichmentSummary
          browserFields={browserFields}
          data={data}
          enrichments={enrichments}
          scopeId={scopeId}
          eventId={eventId}
          isDraggable={isDraggable}
          isReadOnly={isReadOnly}
        />
      </EuiFlexGroup>
    </>
  );
};

export const ThreatSummaryView = React.memo(ThreatSummaryViewComponent);
