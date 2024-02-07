/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */
import { css } from '@emotion/react';
import type { Required } from 'utility-types';
import React, { FC, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { usePageUrlState, useUrlState } from '@kbn/ml-url-state';

import {
  FullTimeRangeSelector,
  mlTimefilterRefresh$,
  useTimefilter,
  DatePickerWrapper,
} from '@kbn/ml-date-picker';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import type { AggregateQuery } from '@kbn/es-query';
import { merge } from 'rxjs';
import { Comparators } from '@elastic/eui';

import {
  useEuiBreakpoint,
  useIsWithinMaxBreakpoint,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getFieldType } from '@kbn/field-utils';
import { UI_SETTINGS } from '@kbn/data-service';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { getOrCreateDataViewByIndexPattern } from '../../search_strategy/requests/get_data_view_by_index_pattern';
import type { SupportedFieldType } from '../../../../../common/types';
import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';
import type { FieldVisConfig } from '../../../common/components/stats_table/types';
import { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import type { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { GetAdditionalLinks } from '../../../common/components/results_links';
import { DocumentCountContent } from '../../../common/components/document_count_content';
import { useTimeBuckets } from '../../../common/hooks/use_time_buckets';
import {
  DataVisualizerTable,
  ItemIdToExpandedRowMap,
} from '../../../common/components/stats_table';
import type {
  MetricFieldsStats,
  TotalFieldsStats,
} from '../../../common/components/stats_table/components/field_count_stats';
import { FieldCountPanel } from '../../../common/components/field_count_panel';
import {
  type ESQLDefaultLimitSizeOption,
  ESQLDefaultLimitSizeSelect,
} from '../search_panel/esql/limit_size';
import {
  ESQLDataVisualizerIndexBasedPageUrlState,
  getDefaultESQLDataVisualizerListState,
  useESQLDataVisualizerData,
} from '../../hooks/esql/use_data_visualizer_esql_data';
import type { DataVisualizerGridInput } from '../../embeddables/grid_embeddable/types';
import { OverallStats } from '../../types/overall_stats';
import { ESQLQuery } from '../../search_strategy/requests/esql_utils';

const defaults = getDefaultPageState();

interface DataVisualizerPageState {
  overallStats: OverallStats;
  metricConfigs: FieldVisConfig[];
  totalMetricFieldCount: number;
  populatedMetricFieldCount: number;
  metricsLoaded: boolean;
  nonMetricConfigs: FieldVisConfig[];
  nonMetricsLoaded: boolean;
  documentCountStats?: FieldVisConfig;
}

export function getDefaultPageState(): DataVisualizerPageState {
  return {
    overallStats: {
      totalCount: 0,
      aggregatableExistsFields: [],
      aggregatableNotExistsFields: [],
      nonAggregatableExistsFields: [],
      nonAggregatableNotExistsFields: [],
    },
    metricConfigs: [],
    totalMetricFieldCount: 0,
    populatedMetricFieldCount: 0,
    metricsLoaded: false,
    nonMetricConfigs: [],
    nonMetricsLoaded: false,
    documentCountStats: undefined,
  };
}

export interface IndexDataVisualizerESQLProps {
  getAdditionalLinks?: GetAdditionalLinks;
}

export const IndexDataVisualizerESQL: FC<IndexDataVisualizerESQLProps> = (dataVisualizerProps) => {
  const { services } = useDataVisualizerKibana();
  const { data, fieldFormats, uiSettings } = services;
  const euiTheme = useCurrentEuiTheme();

  const [query, setQuery] = useState<ESQLQuery>({ esql: '' });
  const [currentDataView, setCurrentDataView] = useState<DataView | undefined>();

  const toggleShowEmptyFields = () => {
    setDataVisualizerListState({
      ...dataVisualizerListState,
      showEmptyFields: !dataVisualizerListState.showEmptyFields,
    });
  };
  const updateLimitSize = (newLimitSize: ESQLDefaultLimitSizeOption) => {
    setDataVisualizerListState({
      ...dataVisualizerListState,
      limitSize: newLimitSize,
    });
  };

  const restorableDefaults = useMemo(
    () => getDefaultESQLDataVisualizerListState({}),
    // We just need to load the saved preference when the page is first loaded

    []
  );

  const [dataVisualizerListState, setDataVisualizerListState] =
    usePageUrlState<ESQLDataVisualizerIndexBasedPageUrlState>(
      DATA_VISUALIZER_INDEX_VIEWER,
      restorableDefaults
    );
  const updateDataView = (dv: DataView) => {
    if (dv.id !== currentDataView?.id) {
      setCurrentDataView(dv);
    }
  };

  // Query that has been typed, but has not submitted with cmd + enter
  const [localQuery, setLocalQuery] = useState<AggregateQuery>({ esql: '' });

  // const onQueryUpdate = (q?: AggregateQuery) => {
  //   // When user submits a new query
  //   // resets all current requests and other data
  //   if (cancelOverallStatsRequest) {
  //     cancelOverallStatsRequest();
  //   }
  //   if (cancelFieldStatsRequest) {
  //     cancelFieldStatsRequest();
  //   }
  //   // Reset field stats to fetch state
  //   setFieldStatFieldsToFetch(undefined);
  //   setMetricConfigs(defaults.metricConfigs);
  //   setNonMetricConfigs(defaults.nonMetricConfigs);
  //   if (q) {
  //     setQuery(q);
  //   }
  // };

  const indexPattern = useMemo(() => {
    let indexPatternFromQuery = '';
    if ('sql' in query) {
      indexPatternFromQuery = getIndexPatternFromESQLQuery(query.sql);
    }
    if ('esql' in query) {
      indexPatternFromQuery = getIndexPatternFromESQLQuery(query.esql);
    }
    // we should find a better way to work with ESQL queries which dont need a dataview
    if (indexPatternFromQuery === '') {
      return undefined;
    }
    return indexPatternFromQuery;
  }, [query]);

  useEffect(
    function updateAdhocDataViewFromQuery() {
      let unmounted = false;

      const update = async () => {
        if (!indexPattern) return;
        const dv = await getOrCreateDataViewByIndexPattern(
          data.dataViews,
          indexPattern,
          currentDataView
        );

        if (dv) {
          updateDataView(dv);
        }
      };

      if (!unmounted) {
        update();
      }

      return () => {
        unmounted = true;
      };
    },

    [indexPattern, data.dataViews, currentDataView]
  );

  const input: DataVisualizerGridInput<ESQLQuery> = useMemo(() => {
    return {
      dataView: currentDataView,
      query,
      savedSearch: undefined,
      sessionId: undefined,
      visibleFieldNames: undefined,
      allowEditDataView: true,
      id: 'esql_data_visualizer',
      indexPattern,
    };
  }, [currentDataView, query?.esql]);

  const hasValidTimeField = useMemo(
    () => currentDataView && currentDataView.timeFieldName !== '',
    [currentDataView]
  );

  const dvPageHeader = css({
    [useEuiBreakpoint(['xs', 's', 'm', 'l'])]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  });

  const isWithinLargeBreakpoint = useIsWithinMaxBreakpoint('l');

  const {
    totalCount,
    progress: combinedProgress,
    overallStatsProgress,
    configs,
    // queryOrAggregateQuery,
    // searchQueryLanguage,
    // searchString,
    // searchQuery,
    // extendedColumns,
    documentCountStats,
    metricsStats,
    overallStats,
    timefilter,
    setLastRefresh,
    getItemIdToExpandedRowMap,
    onQueryUpdate,
    limitSize,
    showEmptyFields,
    fieldsCountStats,
    setFieldStatFieldsToFetch,
  } = useESQLDataVisualizerData(input, dataVisualizerListState, setQuery);

  useEffect(
    function resetFieldStatsFieldToFetch() {
      // If query returns 0 document, no need to do more work here
      if (totalCount === undefined || totalCount === 0) {
        setFieldStatFieldsToFetch(undefined);
        return;
      }
    },
    [totalCount]
  );

  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      bottomBorder={false}
      grow={false}
      data-test-subj="dataVisualizerIndexPage"
      paddingSize="none"
    >
      <EuiPageTemplate.Section>
        <EuiPageTemplate.Header data-test-subj="dataVisualizerPageHeader" css={dvPageHeader}>
          <EuiFlexGroup
            data-test-subj="dataViewTitleHeader"
            direction="row"
            alignItems="center"
            css={{ padding: `${euiTheme.euiSizeS} 0`, marginRight: `${euiTheme.euiSize}` }}
          />

          {isWithinLargeBreakpoint ? <EuiSpacer size="m" /> : null}
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            data-test-subj="dataVisualizerTimeRangeSelectorSection"
          >
            {hasValidTimeField && currentDataView ? (
              <EuiFlexItem grow={false}>
                <FullTimeRangeSelector
                  frozenDataPreference={'exclude-frozen'}
                  setFrozenDataPreference={() => {}}
                  dataView={currentDataView}
                  query={undefined}
                  disabled={false}
                  timefilter={timefilter}
                />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <DatePickerWrapper
                isAutoRefreshOnly={false}
                showRefresh={false}
                width="full"
                needsUpdate={
                  JSON.stringify(localQuery) !== JSON.stringify(query) ? true : undefined
                }
                // isDisabled={!hasValidTimeField}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Header>
        <EuiSpacer size="m" />
        <TextBasedLangEditor
          query={localQuery}
          onTextLangQueryChange={setLocalQuery}
          onTextLangQuerySubmit={onQueryUpdate}
          expandCodeEditor={() => false}
          isCodeEditorExpanded={true}
          detectTimestamp={true}
          hideMinimizeButton={true}
          hideRunQueryText={false}
        />

        <EuiFlexGroup gutterSize="m" direction={isWithinLargeBreakpoint ? 'column' : 'row'}>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder grow={false}>
              {totalCount !== undefined && (
                <>
                  <EuiFlexGroup gutterSize="s" direction="column">
                    <DocumentCountContent
                      documentCountStats={documentCountStats}
                      totalCount={totalCount}
                      samplingProbability={1}
                      loading={false}
                      showSettings={false}
                    />
                  </EuiFlexGroup>
                </>
              )}
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="row">
                <FieldCountPanel
                  showEmptyFields={showEmptyFields}
                  toggleShowEmptyFields={toggleShowEmptyFields}
                  fieldsCountStats={fieldsCountStats}
                  metricsStats={metricsStats}
                />
                <EuiFlexItem />
                <ESQLDefaultLimitSizeSelect
                  limitSize={limitSize}
                  onChangeLimitSize={updateLimitSize}
                />
              </EuiFlexGroup>

              <EuiProgress value={combinedProgress} max={100} size="xs" />
              <DataVisualizerTable<FieldVisConfig>
                items={configs}
                pageState={dataVisualizerListState}
                updatePageState={setDataVisualizerListState}
                getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
                loading={overallStatsProgress.isRunning}
                overallStatsRunning={overallStatsProgress.isRunning}
                showPreviewByDefault={dataVisualizerListState.showDistributions ?? true}
                onChange={setDataVisualizerListState}
                totalCount={totalCount}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
