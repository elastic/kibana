/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { Unit } from '@kbn/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { useDispatch, useSelector } from 'react-redux';
import { eventsViewerSelector } from '../../../../common/components/events_viewer/selectors';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { getHistogramConfig, isNoisy } from './helpers';
import { ChartSeriesConfigs, ChartSeriesData } from '../../../../common/components/charts/common';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { BarChart } from '../../../../common/components/charts/barchart';
import { usePreviewHistogram } from './use_preview_histogram';
import { formatDate } from '../../../../common/components/super_date_picker';
import { alertsPreviewDefaultModel } from '../../alerts_table/default_config';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { TimelineId } from '../../../../../common/types';
import { APP_ID, APP_UI_ID, DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../../../common/lib/cell_actions/constants';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { DetailsPanel } from '../../../../timelines/components/side_panel';
import { PreviewRenderCellValue } from './preview_table_cell_renderer';
import { getPreviewTableControlColumn } from './preview_table_control_columns';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { timelineActions } from '../../../../timelines/store/timeline';
import { State } from '../../../../common/store';

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
  timeFrame: Unit;
  previewId: string;
  addNoiseWarning: () => void;
  spaceId: string;
  ruleType: Type;
  index: string[];
}

const DEFAULT_HISTOGRAM_HEIGHT = 300;

export const PreviewHistogram = ({
  timeFrame,
  previewId,
  addNoiseWarning,
  spaceId,
  ruleType,
  index,
}: PreviewHistogramProps) => {
  const dispatch = useDispatch();
  const { setQuery, isInitializing } = useGlobalTime();
  const { timelines: timelinesUi, cases } = useKibana().services;
  const from = useMemo(() => `now-1${timeFrame}`, [timeFrame]);
  const to = useMemo(() => 'now', []);
  const startDate = useMemo(() => formatDate(from), [from]);
  const endDate = useMemo(() => formatDate(to), [to]);
  const isEqlRule = useMemo(() => ruleType === 'eql', [ruleType]);

  const [isLoading, { data, inspect, totalCount, refetch }] = usePreviewHistogram({
    previewId,
    startDate,
    endDate,
    spaceId,
    index,
    ruleType,
  });

  const {
    timeline: {
      columns,
      dataProviders,
      defaultColumns,
      deletedEventIds,
      graphEventId, // If truthy, the graph viewer (Resolver) is showing
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      sort,
    } = alertsPreviewDefaultModel,
  } = useSelector((state: State) => eventsViewerSelector(state, TimelineId.rulePreview));

  const {
    browserFields,
    docValueFields,
    indexPattern,
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
      if (isNoisy(totalCount, timeFrame)) {
        addNoiseWarning();
      }
    }
  }, [totalCount, addNoiseWarning, timeFrame, previousPreviewId, previewId]);

  useEffect((): void => {
    if (!isLoading && !isInitializing) {
      setQuery({ id: `${ID}-${previewId}`, inspect, loading: isLoading, refetch });
    }
  }, [setQuery, inspect, isLoading, isInitializing, refetch, previewId]);

  useEffect(() => {
    dispatch(
      timelineActions.createTimeline({
        columns,
        dataViewId: selectedDataViewId,
        defaultColumns,
        id: TimelineId.rulePreview,
        indexNames: [`${DEFAULT_PREVIEW_INDEX}-${spaceId}`],
        itemsPerPage,
        sort,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barConfig = useMemo(
    (): ChartSeriesConfigs => getHistogramConfig(endDate, startDate, !isEqlRule),
    [endDate, startDate, isEqlRule]
  );

  const chartData = useMemo((): ChartSeriesData[] => [{ key: 'hits', value: data }], [data]);

  const subtitle = useMemo(
    (): string =>
      isLoading ? i18n.QUERY_PREVIEW_SUBTITLE_LOADING : i18n.QUERY_PREVIEW_TITLE(totalCount),
    [isLoading, totalCount]
  );
  const CasesContext = cases.ui.getCasesContext();

  return (
    <>
      <Panel height={DEFAULT_HISTOGRAM_HEIGHT} data-test-subj={'preview-histogram-panel'}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <HeaderSection
              id={`${ID}-${previewId}`}
              title={i18n.QUERY_GRAPH_HITS_TITLE}
              titleSize="xs"
              subtitle={subtitle}
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
                <p>{i18n.QUERY_PREVIEW_DISCLAIMER}</p>
              </EuiText>
            </>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Panel>
      <EuiSpacer />
      <CasesContext owner={[APP_ID]} userCanCrud={false}>
        <FullScreenContainer $isFullScreen={globalFullScreen}>
          <InspectButtonContainer>
            {timelinesUi.getTGrid<'embedded'>({
              additionalFilters: <></>,
              appId: APP_UI_ID,
              browserFields,
              columns,
              dataProviders,
              deletedEventIds,
              disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
              docValueFields,
              end: endDate,
              entityType: 'events',
              filters: [],
              globalFullScreen,
              graphEventId,
              hasAlertsCrud: false,
              id: TimelineId.rulePreview,
              indexNames: [`${DEFAULT_PREVIEW_INDEX}-${spaceId}`],
              indexPattern,
              isLive: false,
              isLoadingIndexPattern,
              itemsPerPage,
              itemsPerPageOptions,
              kqlMode,
              query: { query: `kibana.alert.rule.uuid:${previewId}`, language: 'kuery' },
              renderCellValue: PreviewRenderCellValue,
              rowRenderers: defaultRowRenderers,
              runtimeMappings,
              setQuery: () => {},
              sort,
              start: startDate,
              tGridEventRenderedViewEnabled,
              type: 'embedded',
              leadingControlColumns: getPreviewTableControlColumn(1.5),
            })}
          </InspectButtonContainer>
        </FullScreenContainer>
        <DetailsPanel
          browserFields={browserFields}
          entityType={'events'}
          docValueFields={docValueFields}
          isFlyoutView
          runtimeMappings={runtimeMappings}
          timelineId={TimelineId.rulePreview}
          isReadOnly
        />
      </CasesContext>
    </>
  );
};
