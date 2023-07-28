/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiFacetButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { coverageOverviewPalatteColors } from './helpers';
import * as i18n from './translations';

export interface CoverageOverviewPanelMetadataProps {
  availableRules: number;
  disabledRules: number;
  enabledRules: number;
}

const MetadataLabel = styled(EuiText)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const CoverageOverviewPanelMetadata = ({
  availableRules,
  disabledRules,
  enabledRules,
}: CoverageOverviewPanelMetadataProps) => {
  return (
    <EuiFlexGroup data-test-subj="coverageOverviewPanelMetadata" direction="column" gutterSize="xs">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <MetadataLabel size="xs">{i18n.AVAILABLE_RULES_METADATA_LABEL}</MetadataLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge color="subdued">{availableRules}</EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <MetadataLabel size="xs">{i18n.DISABLED_RULES_METADATA_LABEL}</MetadataLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge color="subdued">{disabledRules}</EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <MetadataLabel size="xs">{i18n.ENABLED_RULES_METADATA_LABEL}</MetadataLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge color="subdued">{enabledRules}</EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

export const CoverageOverviewRuleListHeader = ({
  listTitle,
  listLength,
}: {
  listTitle: string;
  listLength: number;
}) => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiText size="s">
          <h4>{listTitle}</h4>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiNotificationBadge size="m" color="subdued">
          {listLength}
        </EuiNotificationBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const LegendLabel = ({ label, color }: { label: string; color?: string }) => (
  <EuiFacetButton
    size="xs"
    element="span"
    css={{ padding: 0 }}
    icon={
      <EuiBetaBadge
        css={{ background: color, boxShadow: color != null ? 'none' : undefined }}
        label={label}
        iconType="empty"
        size="s"
      />
    }
  >
    {label}
  </EuiFacetButton>
);

export const CoverageOverviewLegend = () => (
  <EuiPanel css={{ maxWidth: '380px' }} hasBorder>
    <EuiFlexGroup gutterSize="xs">
      <EuiText size="s">
        <h4>{i18n.CoverageOverviewLegendTitle}</h4>
      </EuiText>
      <EuiText size="s">
        <small>{i18n.CoverageOverviewLegendSubtitle}</small>
      </EuiText>
    </EuiFlexGroup>

    <EuiSpacer size="s" />
    <EuiFlexGroup gutterSize="xs" wrap>
      <LegendLabel
        label={`\u003E10 ${i18n.CoverageOverviewLegendRulesLabel}`}
        color={coverageOverviewPalatteColors[3]}
      />

      <LegendLabel
        label={`7-10 ${i18n.CoverageOverviewLegendRulesLabel}`}
        color={coverageOverviewPalatteColors[2]}
      />

      <LegendLabel
        label={`3-6 ${i18n.CoverageOverviewLegendRulesLabel}`}
        color={coverageOverviewPalatteColors[1]}
      />

      <LegendLabel
        label={`1-2 ${i18n.CoverageOverviewLegendRulesLabel}`}
        color={coverageOverviewPalatteColors[0]}
      />

      <LegendLabel label={`0 ${i18n.CoverageOverviewLegendRulesLabel}`} />
    </EuiFlexGroup>
  </EuiPanel>
);
