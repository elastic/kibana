/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
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
