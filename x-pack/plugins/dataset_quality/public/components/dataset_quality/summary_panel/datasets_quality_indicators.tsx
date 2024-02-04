/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';

import {
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiHealth,
  EuiIconTip,
} from '@elastic/eui';
import {
  summaryPanelQualityDegradedText,
  summaryPanelQualityGoodText,
  summaryPanelQualityPoorText,
  summaryPanelQualityText,
  summaryPanelQualityTooltipText,
} from '../../../../common/translations';

export function DatasetsQualityIndicators() {
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{summaryPanelQualityText}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip content={summaryPanelQualityTooltipText} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="m" alignItems="flexEnd">
          <QualityIndicator value="1" quality="danger" description={summaryPanelQualityPoorText} />
          <VerticalRule />
          <QualityIndicator
            value="4"
            quality="warning"
            description={summaryPanelQualityDegradedText}
          />
          <VerticalRule />
          <QualityIndicator value="8" quality="success" description={summaryPanelQualityGoodText} />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const QualityIndicator = ({
  value,
  quality,
  description,
}: {
  value: string;
  quality: 'success' | 'danger' | 'warning';
  description: string;
}) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiTitle size="m">
        <h3>
          <EuiHealth textSize="inherit" color={quality}>
            {value}
          </EuiHealth>
        </h3>
      </EuiTitle>
      <EuiText color={quality}>
        <h5>{description}</h5>
      </EuiText>
    </EuiFlexGroup>
  );
};

const VerticalRule = styled.span`
  width: 1px;
  height: 63px;
  background-color: ${euiThemeVars.euiColorLightShade};
`;
