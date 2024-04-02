/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */
import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePageUrlState } from '@kbn/ml-url-state';

import { FullTimeRangeSelector, DatePickerWrapper } from '@kbn/ml-date-picker';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import type { AggregateQuery } from '@kbn/es-query';

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
import type { DataView } from '@kbn/data-views-plugin/common';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { getOrCreateDataViewByIndexPattern } from '../../search_strategy/requests/get_data_view_by_index_pattern';
import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';
import type { FieldVisConfig } from '../../../common/components/stats_table/types';
import { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import { useDataVisualizerKibana } from '../../../kibana_context';
import type { GetAdditionalLinks } from '../../../common/components/results_links';
import { DocumentCountContent } from '../../../common/components/document_count_content';
import { DataVisualizerTable } from '../../../common/components/stats_table';
import { FieldCountPanel } from '../../../common/components/field_count_panel';
import { ESQLDefaultLimitSizeSelect } from '../search_panel/esql/limit_size';
import {
  getDefaultESQLDataVisualizerListState,
  useESQLDataVisualizerData,
} from '../../hooks/esql/use_data_visualizer_esql_data';
import type {
  DataVisualizerGridInput,
  ESQLDataVisualizerIndexBasedPageUrlState,
  ESQLDefaultLimitSizeOption,
} from '../../embeddables/grid_embeddable/types';
import type { ESQLQuery } from '../../search_strategy/requests/esql_utils';
import { isESQLQuery } from '../../search_strategy/requests/esql_utils';

export interface IndexDataVisualizerESQLProps {
  getAdditionalLinks?: GetAdditionalLinks;
}

export const IndexDataVisualizerESQL: FC<IndexDataVisualizerESQLProps> = (dataVisualizerProps) => {
  const { services } = useDataVisualizerKibana();
  const { data } = services;
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
  const [localQuery, setLocalQuery] = useState<ESQLQuery>({ esql: '' });

  const indexPattern = useMemo(() => {
    let indexPatternFromQuery = '';
    if (isESQLQuery(query)) {
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
    documentCountStats,
    metricsStats,
    timefilter,
    getItemIdToExpandedRowMap,
    onQueryUpdate,
    limitSize,
    showEmptyFields,
    fieldsCountStats,
  } = useESQLDataVisualizerData(input, dataVisualizerListState, setQuery);

  const hasValidTimeField = useMemo(
    () => currentDataView?.timeFieldName !== undefined,
    [currentDataView?.timeFieldName]
  );

  const queryNeedsUpdate = useMemo(
    () => (localQuery.esql !== query.esql ? true : undefined),
    [localQuery.esql, query.esql]
  );

  const handleRefresh = useCallback(() => {
    // The page is already autoamtically updating when time range is changed
    // via the url state
    // so we just need to force update if the query is outdated
    if (queryNeedsUpdate) {
      setQuery(localQuery);
    }
  }, [queryNeedsUpdate, localQuery.esql]);

  const onTextLangQueryChange = useCallback((q: AggregateQuery) => {
    if (isESQLQuery(q)) {
      setLocalQuery(q);
    }
  }, []);
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
                isAutoRefreshOnly={!hasValidTimeField}
                showRefresh={!hasValidTimeField}
                width="full"
                needsUpdate={queryNeedsUpdate}
                onRefresh={handleRefresh}
                isDisabled={!hasValidTimeField}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Header>
        <EuiSpacer size="m" />
        <TextBasedLangEditor
          query={localQuery}
          onTextLangQueryChange={onTextLangQueryChange}
          onTextLangQuerySubmit={onQueryUpdate}
          expandCodeEditor={() => false}
          isCodeEditorExpanded={true}
          detectTimestamp={true}
          hideMinimizeButton={true}
          hideRunQueryText={false}
          hideQueryHistory
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
                  <EuiSpacer size="s" />
                </>
              )}
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
              <EuiSpacer size="s" />

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
