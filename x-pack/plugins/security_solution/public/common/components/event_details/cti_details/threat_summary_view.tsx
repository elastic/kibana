/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import React, { useCallback, useState } from 'react';
import {
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPopover,
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import * as i18n from './translations';
import type { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';

import type {
  BrowserFields,
  TimelineEventsDetailsItem,
  RiskSeverity,
} from '../../../../../common/search_strategy';
import { RiskSummary } from './risk_summary';
import { EnrichmentSummary } from './enrichment_summary';
import type { HostRisk, UserRisk } from '../../../../explore/containers/risk_score';
import { RiskScoreEntity } from '../../../../../common/search_strategy';

const UppercaseEuiTitle = styled(EuiTitle)`
  text-transform: uppercase;
`;

const ThreatSummaryPanelTitle: React.FC = ({ children }) => (
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
}> = ({ title, toolTipContent }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  return (
    <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
      <EuiFlexItem>
        <ThreatSummaryPanelTitle>{title}</ThreatSummaryPanelTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="leftCenter"
          button={
            <EuiButtonIcon
              color="text"
              size="xs"
              iconSize="m"
              iconType="iInCircle"
              aria-label={i18n.INFORMATION_ARIA_LABEL}
              onClick={onClick}
            />
          }
        >
          <EuiPopoverTitle>{title}</EuiPopoverTitle>
          <EuiText size="s" style={{ width: '270px' }}>
            {toolTipContent}
          </EuiText>
        </EuiPopover>
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

  return (
    <>
      <EuiHorizontalRule />

      <EuiTitle size="xxxs">
        <h5>{i18n.ENRICHED_DATA}</h5>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="m" style={{ flexGrow: 0 }}>
        <EuiFlexItem grow={false}>
          <RiskSummary
            riskEntity={RiskScoreEntity.host}
            risk={hostRisk}
            originalRisk={originalHostRisk}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <RiskSummary
            riskEntity={RiskScoreEntity.user}
            risk={userRisk}
            originalRisk={originalUserRisk}
          />
        </EuiFlexItem>

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
