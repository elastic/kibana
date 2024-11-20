/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import { ENDPOINT_INSIGHTS } from '../../../translations';

interface EndpointInsightsScanProps {
  configureConnectors: boolean;
}

export const EndpointInsightsScan = ({ configureConnectors }: EndpointInsightsScanProps) => {
  const renderButton = () => {
    if (configureConnectors) {
      return <EuiButton size="s">{ENDPOINT_INSIGHTS.scanButton.addScanner}</EuiButton>;
    } else {
      return <EuiButton size="s">{ENDPOINT_INSIGHTS.scanButton.title}</EuiButton>;
    }
  };
  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <AssistantAvatar size={'xs'} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{ENDPOINT_INSIGHTS.scanTitle}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{renderButton()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
