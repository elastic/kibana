/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import { KibanaErrorBoundary } from '@kbn/shared-ux-error-boundary';

import { flyoutDegradedDocsTrendText } from '../../../../common/translations';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';
import { useKibanaContextForPlugin } from '../../../utils';
import { useDegradedDocsChart } from '../../../hooks';

const CHART_HEIGHT = 180;
const DISABLED_ACTIONS = [
  'ACTION_CUSTOMIZE_PANEL',
  'ACTION_CONFIGURE_IN_LENS',
  'ACTION_OPEN_IN_DISCOVER',
  'create-ml-ad-job-action',
];

export function DegradedDocsChart({
  dataStream,
  timeRange,
  lastReloadTime,
}: {
  dataStream?: string;
  timeRange: TimeRangeConfig;
  lastReloadTime: number;
}) {
  const {
    services: { lens },
  } = useKibanaContextForPlugin();

  const { attributes, filterQuery, extraActions, isChartLoading, handleChartLoading } =
    useDegradedDocsChart({ dataStream });

  return (
    <>
      <KibanaErrorBoundary>
        <EuiFlexGroup
          css={{ minHeight: CHART_HEIGHT }}
          direction="column"
          justifyContent="center"
          alignItems={isChartLoading === undefined ? 'center' : undefined}
        >
          {!attributes ? (
            <EuiLoadingChart title={flyoutDegradedDocsTrendText} size="l" mono={true} />
          ) : (
            <lens.EmbeddableComponent
              id="datasetQualityFlyoutDegradedDocsTrend"
              style={{ height: CHART_HEIGHT }}
              css={lensEmbeddableComponentStyles}
              viewMode={ViewMode.VIEW}
              hidePanelTitles={true}
              disabledActions={DISABLED_ACTIONS}
              timeRange={timeRange}
              attributes={attributes!}
              withDefaultActions={true}
              extraActions={extraActions}
              disableTriggers={false}
              lastReloadRequestTime={lastReloadTime}
              query={{
                language: 'kuery',
                query: filterQuery || '',
              }}
              onLoad={handleChartLoading}
            />
          )}
        </EuiFlexGroup>
      </KibanaErrorBoundary>
    </>
  );
}

const lensEmbeddableComponentStyles = css`
  .lnsExpressionRenderer__component {
    margin-left: -16px;

    .expExpressionRenderer__expression {
      padding: 0 !important;
    }
  }
`;
