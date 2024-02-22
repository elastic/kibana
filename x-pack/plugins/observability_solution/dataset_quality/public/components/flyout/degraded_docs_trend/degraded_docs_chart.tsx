/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import { KibanaErrorBoundary } from '@kbn/shared-ux-error-boundary';

import { indexNameToDataStreamParts } from '../../../../common/utils';
import { DEFAULT_LOGS_DATA_VIEW } from '../../../../common/constants';
import { flyoutDegradedDocsTrendText } from '../../../../common/translations';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';
import { useKibanaContextForPlugin } from '../../../utils';
import { useCreateDataView } from '../../../hooks';
import { getLensAttributes } from './lens_attributes';

const CHART_HEIGHT = 180;
const DISABLED_ACTIONS = [
  'ACTION_CUSTOMIZE_PANEL',
  'ACTION_CONFIGURE_IN_LENS',
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

  const { euiTheme } = useEuiTheme();

  const [isChartLoading, setIsChartLoading] = useState<boolean | undefined>(undefined);
  const [attributes, setAttributes] = useState<ReturnType<typeof getLensAttributes> | undefined>(
    undefined
  );

  const datasetTypeIndexPattern = dataStream
    ? `${indexNameToDataStreamParts(dataStream).type}-*-*`
    : undefined;
  const { dataView } = useCreateDataView({
    indexPatternString: datasetTypeIndexPattern ?? DEFAULT_LOGS_DATA_VIEW,
  });

  const handleChartLoading = (isLoading: boolean) => {
    setIsChartLoading(isLoading);
  };

  const filterQuery = `_index: ${dataStream ?? 'match-none'}`;

  useEffect(() => {
    if (dataView) {
      const lensAttributes = getLensAttributes(euiTheme.colors.danger, dataView);
      setAttributes(lensAttributes);
    }
  }, [lens, euiTheme.colors.danger, dataView]);

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
