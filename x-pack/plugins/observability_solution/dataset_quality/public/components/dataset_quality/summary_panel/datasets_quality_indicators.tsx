/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';

import {
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiHealth,
  EuiIconTip,
  EuiSkeletonTitle,
} from '@elastic/eui';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { InfoIndicators } from '../../../../common/types';
import { useSummaryPanelContext } from '../../../hooks';
import {
  summaryPanelQualityDegradedText,
  summaryPanelQualityGoodText,
  summaryPanelQualityPoorText,
  summaryPanelQualityText,
  summaryPanelQualityTooltipText,
} from '../../../../common/translations';
import { mapPercentagesToQualityCounts } from '../../quality_indicator';

export function DatasetsQualityIndicators() {
  const { onPageReady } = usePerformanceContext();
  const {
    datasetsQuality,
    isDatasetsQualityLoading,
    datasetsActivity,
    numberOfDatasets,
    numberOfDocuments,
  } = useSummaryPanelContext();
  const qualityCounts = mapPercentagesToQualityCounts(datasetsQuality.percentages);
  const datasetsWithoutIgnoredField =
    datasetsActivity.total > 0 ? datasetsActivity.total - datasetsQuality.percentages.length : 0;

  if (!isDatasetsQualityLoading && (numberOfDatasets || numberOfDocuments)) {
    onPageReady({
      key1: 'datasets',
      value1: numberOfDatasets,
      key2: 'documents',
      value2: numberOfDocuments,
    });
  }

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
          <QualityIndicator
            value={qualityCounts.poor}
            quality="danger"
            description={summaryPanelQualityPoorText}
            isLoading={isDatasetsQualityLoading}
          />
          <span css={verticalRule} />
          <QualityIndicator
            value={qualityCounts.degraded}
            quality="warning"
            description={summaryPanelQualityDegradedText}
            isLoading={isDatasetsQualityLoading}
          />
          <span css={verticalRule} />
          <QualityIndicator
            value={qualityCounts.good + datasetsWithoutIgnoredField}
            quality="success"
            description={summaryPanelQualityGoodText}
            isLoading={isDatasetsQualityLoading}
          />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const QualityIndicator = ({
  value,
  quality,
  description,
  isLoading,
}: {
  value: number;
  quality: InfoIndicators;
  description: string;
  isLoading: boolean;
}) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {isLoading ? (
        <EuiSkeletonTitle size="m" />
      ) : (
        <EuiTitle size="m">
          <h3>
            <EuiHealth
              data-test-subj={`datasetQualityDatasetHealthKpi-${description}`}
              textSize="inherit"
              color={quality}
            >
              {value || 0}
            </EuiHealth>
          </h3>
        </EuiTitle>
      )}
      <EuiText color={quality}>
        <h5>{description}</h5>
      </EuiText>
    </EuiFlexGroup>
  );
};

const verticalRule = css`
  width: 1px;
  height: 63px;
  background-color: ${euiThemeVars.euiColorLightShade};
`;
