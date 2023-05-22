/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DataViewBase } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import { StatefulEventsViewer } from '../../../../common/components/events_viewer';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';

import type {
  ChartSeriesConfigs,
  ChartSeriesData,
} from '../../../../common/components/charts/common';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { BarChart } from '../../../../common/components/charts/barchart';

import { getAlertsPreviewDefaultModel } from '../../alerts_table/default_config';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { DetailsPanel } from '../../../../timelines/components/side_panel';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import type { TimeframePreviewOptions } from '../../../pages/detection_engine/rules/types';
import { useLicense } from '../../../../common/hooks/use_license';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { getRulePreviewLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/rule_preview';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useAdHocRunHistogram } from './use_ad_hoc_run_histogram';

/* Imports from Rule Preview */
import { getHistogramConfig, isNoisy } from '../rule_preview/helpers';
import { PreviewRenderCellValue } from '../rule_preview/preview_table_cell_renderer';
import { getPreviewTableControlColumn } from '../rule_preview/preview_table_control_columns';

const LoadingChart = styled(EuiLoadingChart)`
  display: block;
  margin: 0 auto;
`;

const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : undefined)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
`;

export const ID = 'adHocRunHistogram';

const CHART_HEIGHT = 150;

interface AdHocRunHistogramProps {
  executionId: string;
  addNoiseWarning: () => void;
  spaceId: string;
  ruleType: Type;
  indexPattern: DataViewBase | undefined;
  timeframeOptions: TimeframePreviewOptions;
}

const DEFAULT_HISTOGRAM_HEIGHT = 300;

export const AdHocRunHistogram = ({
  executionId,
  addNoiseWarning,
  spaceId,
  ruleType,
  indexPattern,
  timeframeOptions,
}: AdHocRunHistogramProps) => {
  const { uiSettings } = useKibana().services;
  const { setQuery, isInitializing } = useGlobalTime();
  const startDate = useMemo(
    () => timeframeOptions.timeframeStart.toISOString(),
    [timeframeOptions]
  );
  const endDate = useMemo(() => timeframeOptions.timeframeEnd.toISOString(), [timeframeOptions]);
  // It seems like the Table/Grid component uses end date value as a non-inclusive one,
  // thus the alerts which have timestamp equal to the end date value are not displayed in the table.
  // To fix that, we extend end date value by 1s to make sure all alerts are included in the table.
  const extendedEndDate = useMemo(
    () => timeframeOptions.timeframeEnd.clone().add('1', 's').toISOString(),
    [timeframeOptions]
  );
  const isEqlRule = useMemo(() => ruleType === 'eql', [ruleType]);
  const isMlRule = useMemo(() => ruleType === 'machine_learning', [ruleType]);

  const isAlertsPreviewChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled(
    'alertsPreviewChartEmbeddablesEnabled'
  );
  const timerange = useMemo(() => ({ from: startDate, to: endDate }), [startDate, endDate]);

  const extraVisualizationOptions = useMemo(
    () => ({
      ruleId: executionId,
      spaceId,
    }),
    [executionId, spaceId]
  );

  const [isLoading, { data, inspect, totalCount, refetch }] = useAdHocRunHistogram({
    executionId,
    startDate,
    endDate,
    spaceId,
    indexPattern,
    ruleType,
    skip: isAlertsPreviewChartEmbeddablesEnabled,
  });
  const license = useLicense();
  const { browserFields, runtimeMappings } = useSourcererDataView(SourcererScopeName.detections);

  const { globalFullScreen } = useGlobalFullScreen();
  const previousExecutionId = usePrevious(executionId);
  const adHocRunQueryId = `${ID}-${executionId}`;

  useEffect(() => {
    if (previousExecutionId !== executionId && totalCount > 0) {
      if (isNoisy(totalCount, timeframeOptions)) {
        addNoiseWarning();
      }
    }
  }, [totalCount, addNoiseWarning, previousExecutionId, executionId, timeframeOptions]);

  useEffect((): void => {
    if (!isLoading && !isInitializing) {
      setQuery({
        id: adHocRunQueryId,
        inspect,
        loading: isLoading,
        refetch,
      });
    }
  }, [
    setQuery,
    inspect,
    isLoading,
    isInitializing,
    refetch,
    executionId,
    isAlertsPreviewChartEmbeddablesEnabled,
    adHocRunQueryId,
  ]);

  const barConfig = useMemo(
    (): ChartSeriesConfigs => getHistogramConfig(endDate, startDate, !isEqlRule),
    [endDate, startDate, isEqlRule]
  );

  const chartData = useMemo((): ChartSeriesData[] => [{ key: 'hits', value: data }], [data]);
  const config = getEsQueryConfig(uiSettings);
  const pageFilters = useMemo(() => {
    const filterQuery = buildEsQuery(
      indexPattern,
      [{ query: `kibana.alert.rule.execution.uuid:${executionId}`, language: 'kuery' }],
      [],
      {
        nestedIgnoreUnmapped: true,
        ...config,
        dateFormatTZ: undefined,
      }
    );
    return [
      {
        ...filterQuery,
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'kibana.alert.rule.uuid',
          params: {
            query: executionId,
          },
        },
      },
    ];
  }, [config, indexPattern, executionId]);

  return (
    <>
      <Panel height={DEFAULT_HISTOGRAM_HEIGHT} data-test-subj={'adHocRun-histogram-panel'}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <HeaderSection
              id={adHocRunQueryId}
              title={i18n.QUERY_GRAPH_HITS_TITLE}
              titleSize="xs"
              showInspectButton={!isAlertsPreviewChartEmbeddablesEnabled}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            {isLoading ? (
              <LoadingChart size="l" data-test-subj="adHocRun-histogram-loading" />
            ) : isAlertsPreviewChartEmbeddablesEnabled ? (
              <VisualizationEmbeddable
                applyGlobalQueriesAndFilters={false}
                extraOptions={extraVisualizationOptions}
                getLensAttributes={getRulePreviewLensAttributes}
                height={CHART_HEIGHT}
                id={`${adHocRunQueryId}-embeddable`}
                inspectTitle={i18n.QUERY_GRAPH_HITS_TITLE}
                scopeId={SourcererScopeName.detections}
                stackByField={ruleType === 'machine_learning' ? 'host.name' : 'event.category'}
                timerange={timerange}
                withActions={false}
              />
            ) : (
              <BarChart
                configs={barConfig}
                barChart={chartData}
                data-test-subj="ad-hoc-run-histogram-bar-chart"
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <>
              <EuiSpacer />
              <EuiText size="s" color="subdued">
                <p>
                  {isMlRule
                    ? i18n.ML_AD_HOC_RUN_HISTOGRAM_DISCLAIMER
                    : i18n.AD_HOC_RUN_HISTOGRAM_DISCLAIMER}
                </p>
              </EuiText>
            </>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Panel>
      <EuiSpacer />
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <StatefulEventsViewer
          pageFilters={pageFilters}
          defaultModel={getAlertsPreviewDefaultModel(license)}
          end={extendedEndDate}
          tableId={TableId.rulePreview}
          leadingControlColumns={getPreviewTableControlColumn(1.5)}
          renderCellValue={PreviewRenderCellValue}
          rowRenderers={defaultRowRenderers}
          start={startDate}
          sourcererScope={SourcererScopeName.detections}
          indexNames={[`${DEFAULT_ALERTS_INDEX}-${spaceId}`]}
          bulkActions={false}
        />
      </FullScreenContainer>
      <DetailsPanel
        browserFields={browserFields}
        isFlyoutView
        runtimeMappings={runtimeMappings}
        scopeId={TableId.rulePreview}
        isReadOnly
      />
    </>
  );
};
