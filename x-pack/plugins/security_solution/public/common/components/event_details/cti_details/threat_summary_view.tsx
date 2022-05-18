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
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';

import { FieldsData } from '../types';

import {
  BrowserField,
  BrowserFields,
  TimelineEventsDetailsItem,
} from '../../../../../common/search_strategy';
import { HostRiskSummary } from './host_risk_summary';
import { EnrichmentSummary } from './enrichment_summary';
import { HostRisk } from '../../../../risk_score/containers';

export interface ThreatSummaryDescription {
  browserField: BrowserField;
  data: FieldsData | undefined;
  eventId: string;
  index: number;
  provider: string | undefined;
  timelineId: string;
  value: string | undefined;
  isDraggable?: boolean;
}

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
  title: string | undefined;
}> = ({ title }) => (
  <StyledEnrichmentFieldTitle size="xxxs">
    <h6>{title}</h6>
  </StyledEnrichmentFieldTitle>
);

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  margin-top: ${({ theme }) => theme.eui.euiSizeS};
`;

export const EnrichedDataRow: React.FC<{ field: string | undefined; value: React.ReactNode }> = ({
  field,
  value,
}) => (
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
  title: string;
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
  timelineId: string;
  hostRisk: HostRisk | null;
  isDraggable?: boolean;
}> = ({ browserFields, data, enrichments, eventId, timelineId, hostRisk, isDraggable }) => {
  if (!hostRisk && enrichments.length === 0) {
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
        {hostRisk && (
          <EuiFlexItem grow={false}>
            <HostRiskSummary hostRisk={hostRisk} />
          </EuiFlexItem>
        )}

        <EnrichmentSummary
          browserFields={browserFields}
          data={data}
          enrichments={enrichments}
          timelineId={timelineId}
          eventId={eventId}
          isDraggable={isDraggable}
        />
      </EuiFlexGroup>
    </>
  );
};

export const ThreatSummaryView = React.memo(ThreatSummaryViewComponent);
