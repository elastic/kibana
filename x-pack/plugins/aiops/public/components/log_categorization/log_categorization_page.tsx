/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { Filter, Query } from '@kbn/es-query';
import {
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  // EuiHorizontalRule,
  EuiTitle,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiLoadingContent,
} from '@elastic/eui';

import { useAiOpsKibana } from '../../kibana_context';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DatePickerWrapper } from '../date_picker_wrapper';
import { TimeBuckets } from '../../../common/time_buckets';
import { useData } from '../../hooks/use_data';
import { SearchPanel } from '../search_panel';
import { SearchQueryLanguage, SavedSearchSavedObject } from '../../application/utils/search_utils';
import { useUrlState /* , usePageUrlState, AppStateKey*/ } from '../../hooks/url_state';
import { restorableDefaults } from '../explain_log_rate_spikes/explain_log_rate_spikes_app_state';
import { useCategorizeRequest } from './use_categorize_request';
import type { EventRate } from './use_categorize_request';
import { CategoryTable } from './category_table';
import { DocumentCountChart } from './document_count_chart';

export interface LogCategorizationPageProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
}

const QUERY_MODE = {
  INCLUDE: 'should',
  EXCLUDE: 'must_not',
} as const;
export type QueryMode = typeof QUERY_MODE[keyof typeof QUERY_MODE];

export interface Category {
  key: string;
  count: number;
  examples: string[];
  sparkline?: Array<{ doc_count: number; key: number; key_as_string: string }>;
}

export type SparkLinesPerCategory = Record<string, Record<number, number>>;

export const LogCategorizationPage: FC<LogCategorizationPageProps> = ({
  dataView,
  savedSearch,
}) => {
  const {
    services: { uiSettings },
  } = useAiOpsKibana();

  const { runCategorizeRequest, runEventRateRequest, cancelRequests } = useCategorizeRequest();
  // const [aiopsListState, setAiopsListState] = usePageUrlState(AppStateKey, restorableDefaults);
  const [aiopsListState, setAiopsListState] = useState(restorableDefaults);
  const [, setGlobalState] = useUrlState('_g');
  const [selectedField, setSelectedField] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [currentSavedSearch, setCurrentSavedSearch] = useState(savedSearch);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  const [sparkLines, setSparkLines] = useState<SparkLinesPerCategory>({});

  const _timeBuckets = useMemo(() => {
    return new TimeBuckets({
      [UI_SETTINGS.HISTOGRAM_MAX_BARS]: uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, [uiSettings]);

  useEffect(() => {
    if (savedSearch) {
      setCurrentSavedSearch(savedSearch);
    }
  }, [savedSearch]);

  useEffect(() => {
    return () => {
      cancelRequests();
    };
  }, [cancelRequests]);

  const setSearchParams = useCallback(
    (searchParams: {
      searchQuery: Query['query'];
      searchString: Query['query'];
      queryLanguage: SearchQueryLanguage;
      filters: Filter[];
    }) => {
      // When the user loads saved search and then clear or modify the query
      // we should remove the saved search and replace it with the index pattern id
      if (currentSavedSearch !== null) {
        setCurrentSavedSearch(null);
      }

      setAiopsListState({
        ...aiopsListState,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [currentSavedSearch, aiopsListState, setAiopsListState]
  );

  const { timefilter, earliest, latest, searchQueryLanguage, searchString, searchQuery } = useData(
    { currentDataView: dataView, currentSavedSearch },
    aiopsListState,
    setGlobalState,
    undefined
  );

  const fields = useMemo(
    () =>
      dataView.fields
        .filter(
          ({ displayName, esTypes, count }) =>
            esTypes && esTypes.includes('text') && !['_id', '_index'].includes(displayName)
        )
        .map(({ displayName }) => ({
          label: displayName,
        })),
    [dataView]
  );

  useEffect(() => {
    if (fields.length === 1) {
      setSelectedField(fields[0].label);
    }
  }, [fields]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setCategories(null);
    const { title: index, timeFieldName: timeField } = dataView;

    const timefilterActiveBounds = timefilter.getActiveBounds();

    if (
      timefilterActiveBounds === undefined ||
      selectedField === undefined ||
      timeField === undefined
    ) {
      return;
    }

    const BAR_TARGET = 20;
    _timeBuckets.setInterval('auto');
    _timeBuckets.setBounds(timefilterActiveBounds);
    _timeBuckets.setBarTarget(BAR_TARGET);
    const intervalMs = _timeBuckets.getInterval()?.asMilliseconds();

    cancelRequests();

    runEventRateRequest(
      index,
      selectedField,
      timeField,
      earliest,
      latest,
      searchQuery,
      intervalMs
    ).then((resp) => {
      setEventRate(resp.eventRate);
      setTotalCount(resp.totalCount);
    });

    const { categories: tempCategories, sparkLinesPerCategory: tempSparkLinesPerCategory } =
      await runCategorizeRequest(
        index,
        selectedField,
        timeField,
        earliest,
        latest,
        searchQuery,
        intervalMs
      );

    setCategories(tempCategories);
    setSparkLines(tempSparkLinesPerCategory);
    setLoading(false);
  }, [
    selectedField,
    dataView,
    timefilter,
    _timeBuckets,
    searchQuery,
    earliest,
    latest,
    runCategorizeRequest,
    runEventRateRequest,
    cancelRequests,
  ]);

  const onFieldChange = (value: EuiComboBoxOptionOption[] | undefined) => {
    setSelectedField(value && value.length ? value[0].label : undefined);
  };

  return (
    <EuiPageBody data-test-subj="aiopsExplainLogRateSpikesPage" paddingSize="none" panelled={false}>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiPageContentHeader className="aiopsPageHeader">
            <EuiPageContentHeaderSection>
              <div className="dataViewTitleHeader">
                <EuiTitle size={'s'}>
                  <h2>{dataView.getName()}</h2>
                </EuiTitle>
              </div>
            </EuiPageContentHeaderSection>

            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              data-test-subj="aiopsTimeRangeSelectorSection"
            >
              {dataView.timeFieldName !== undefined && (
                <EuiFlexItem grow={false}>
                  <FullTimeRangeSelector
                    dataView={dataView}
                    query={undefined}
                    disabled={false}
                    timefilter={timefilter}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <DatePickerWrapper />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentHeader>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <SearchPanel
            dataView={dataView}
            searchString={searchString ?? ''}
            searchQuery={searchQuery}
            searchQueryLanguage={searchQueryLanguage}
            setSearchParams={setSearchParams}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false} style={{ minWidth: '410px' }}>
          <EuiFormRow label="Category field">
            <EuiComboBox
              isDisabled={loading === true}
              options={fields}
              onChange={onFieldChange}
              selectedOptions={selectedField === undefined ? undefined : [{ label: selectedField }]}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginTop: 'auto' }}>
          {loading === false ? (
            <EuiButton
              disabled={selectedField === undefined}
              onClick={() => {
                loadCategories();
              }}
            >
              Run categorization
            </EuiButton>
          ) : (
            <EuiButton onClick={() => cancelRequests()}>Cancel</EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginTop: 'auto' }} />
        <EuiFlexItem />
      </EuiFlexGroup>

      {eventRate.length ? (
        <>
          <EuiSpacer />
          <DocumentCountChart
            eventRate={eventRate}
            pinnedCategory={pinnedCategory}
            selectedCategory={selectedCategory}
            sparkLines={sparkLines}
            totalCount={totalCount}
          />
          <EuiSpacer />
        </>
      ) : null}
      {loading === true ? <EuiLoadingContent lines={10} /> : null}
      {categories !== null ? (
        <CategoryTable
          categories={categories}
          aiopsListState={aiopsListState}
          dataViewId={dataView.id!}
          eventRate={eventRate}
          sparkLines={sparkLines}
          selectedField={selectedField}
          pinnedCategory={pinnedCategory}
          setPinnedCategory={setPinnedCategory}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          timefilter={timefilter}
        />
      ) : null}
    </EuiPageBody>
  );
};
