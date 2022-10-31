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
import { useDispatch, useSelector } from 'react-redux';
import type { DataViewBase } from '@kbn/es-query';
import type { SortColumnTable } from '@kbn/timelines-plugin/common/types';
import { dataTableActions } from '../../../../common/store/data_table';
import { eventsViewerSelector } from '../../../../common/components/events_viewer/selectors';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { getHistogramConfig, isNoisy } from './helpers';
import type {
  ChartSeriesConfigs,
  ChartSeriesData,
} from '../../../../common/components/charts/common';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { BarChart } from '../../../../common/components/charts/barchart';
import { usePreviewHistogram } from './use_preview_histogram';
import { getAlertsPreviewDefaultModel } from '../../alerts_table/default_config';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { TableId } from '../../../../../common/types';
import { APP_UI_ID, DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../../../common/lib/cell_actions/constants';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { DetailsPanel } from '../../../../timelines/components/side_panel';
import { PreviewRenderCellValue } from './preview_table_cell_renderer';
import { getPreviewTableControlColumn } from './preview_table_control_columns';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import type { State } from '../../../../common/store';
import type { TimeframePreviewOptions } from '../../../pages/detection_engine/rules/types';
import { useLicense } from '../../../../common/hooks/use_license';

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

export const ID = 'previewHistogram';

interface PreviewHistogramProps {
  previewId: string;
  addNoiseWarning: () => void;
  spaceId: string;
  ruleType: Type;
  indexPattern: DataViewBase | undefined;
  timeframeOptions: TimeframePreviewOptions;
}

const DEFAULT_HISTOGRAM_HEIGHT = 300;

export const PreviewHistogram = ({
  previewId,
  addNoiseWarning,
  spaceId,
  ruleType,
  indexPattern,
  timeframeOptions,
}: PreviewHistogramProps) => {
  const dispatch = useDispatch();
  const { setQuery, isInitializing } = useGlobalTime();
  const { timelines: timelinesUi } = useKibana().services;
  const startDate = useMemo(
    () => timeframeOptions.timeframeStart.toISOString(),
    [timeframeOptions]
  );
  const endDate = useMemo(() => timeframeOptions.timeframeEnd.toISOString(), [timeframeOptions]);
  // It seems like the Table/Grid component uses end date value as a non-inclusive one,
  // thus the alerts which have timestamp equal to the end date value are not displayed in the table.
  // To fix that, we extend end date value by 1s to make sure all alerts are included in the table.
  const extendedEndDate = useMemo(
    () => timeframeOptions.timeframeEnd.add('1', 's').toISOString(),
    [timeframeOptions]
  );
  const isEqlRule = useMemo(() => ruleType === 'eql', [ruleType]);
  const isMlRule = useMemo(() => ruleType === 'machine_learning', [ruleType]);

  const [isLoading, { data, inspect, totalCount, refetch }] = usePreviewHistogram({
    previewId,
    startDate,
    endDate,
    spaceId,
    indexPattern,
    ruleType,
  });
  const license = useLicense();
  const {
    dataTable: {
      columns,
      defaultColumns,
      deletedEventIds,
      itemsPerPage,
      itemsPerPageOptions,
      sort,
    } = getAlertsPreviewDefaultModel(license),
  } = useSelector((state: State) => eventsViewerSelector(state, TableId.rulePreview));

  const {
    browserFields,
    indexPattern: selectedIndexPattern,
    runtimeMappings,
    dataViewId: selectedDataViewId,
    loading: isLoadingIndexPattern,
  } = useSourcererDataView(SourcererScopeName.detections);

  const { globalFullScreen } = useGlobalFullScreen();
  const previousPreviewId = usePrevious(previewId);
  const tGridEventRenderedViewEnabled = useIsExperimentalFeatureEnabled(
    'tGridEventRenderedViewEnabled'
  );

  useEffect(() => {
    if (previousPreviewId !== previewId && totalCount > 0) {
      if (isNoisy(totalCount, timeframeOptions)) {
        addNoiseWarning();
      }
    }
  }, [totalCount, addNoiseWarning, previousPreviewId, previewId, timeframeOptions]);

  useEffect((): void => {
    if (!isLoading && !isInitializing) {
      setQuery({ id: `${ID}-${previewId}`, inspect, loading: isLoading, refetch });
    }
  }, [setQuery, inspect, isLoading, isInitializing, refetch, previewId]);

  useEffect(() => {
    dispatch(
      dataTableActions.createTGrid({
        columns,
        dataViewId: selectedDataViewId,
        defaultColumns,
        id: TableId.rulePreview,
        indexNames: [`${DEFAULT_PREVIEW_INDEX}-${spaceId}`],
        itemsPerPage,
        sort: sort as SortColumnTable[],
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barConfig = useMemo(
    (): ChartSeriesConfigs => getHistogramConfig(endDate, startDate, !isEqlRule),
    [endDate, startDate, isEqlRule]
  );

  const chartData = useMemo((): ChartSeriesData[] => [{ key: 'hits', value: data }], [data]);

  return (
    <>
      <Panel height={DEFAULT_HISTOGRAM_HEIGHT} data-test-subj={'preview-histogram-panel'}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <HeaderSection
              id={`${ID}-${previewId}`}
              title={i18n.QUERY_GRAPH_HITS_TITLE}
              titleSize="xs"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            {isLoading ? (
              <LoadingChart size="l" data-test-subj="preview-histogram-loading" />
            ) : (
              <BarChart
                configs={barConfig}
                barChart={chartData}
                data-test-subj="preview-histogram-bar-chart"
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <>
              <EuiSpacer />
              <EuiText size="s" color="subdued">
                <p>
                  {isMlRule
                    ? i18n.ML_PREVIEW_HISTOGRAM_DISCLAIMER
                    : i18n.PREVIEW_HISTOGRAM_DISCLAIMER}
                </p>
              </EuiText>
            </>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Panel>
      <EuiSpacer />
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <InspectButtonContainer>
          
        </InspectButtonContainer>
      </FullScreenContainer>
      <DetailsPanel
        browserFields={browserFields}
        entityType={'events'}
        isFlyoutView
        runtimeMappings={runtimeMappings}
        scopeId={TableId.rulePreview}
        isReadOnly
      />
    </>
  );
};
