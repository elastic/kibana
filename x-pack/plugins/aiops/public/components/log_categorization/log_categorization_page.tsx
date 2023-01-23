/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';

import {
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiLoadingContent,
} from '@elastic/eui';

import { Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUrlState } from '@kbn/ml-url-state';

import { useDataSource } from '../../hooks/use_data_source';
import { useData } from '../../hooks/use_data';
import type { SearchQueryLanguage } from '../../application/utils/search_utils';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { restorableDefaults } from '../explain_log_rate_spikes/explain_log_rate_spikes_app_state';
import { SearchPanel } from '../search_panel';
import { PageHeader } from '../page_header';

import type { EventRate, Category, SparkLinesPerCategory } from './use_categorize_request';
import { useCategorizeRequest } from './use_categorize_request';
import { CategoryTable } from './category_table';
import { DocumentCountChart } from './document_count_chart';
import { InformationText } from './information_text';

const BAR_TARGET = 20;

export const LogCategorizationPage: FC = () => {
  const {
    notifications: { toasts },
  } = useAiopsAppContext();
  const { dataView, savedSearch } = useDataSource();

  const { runCategorizeRequest, cancelRequest } = useCategorizeRequest();
  const [aiopsListState, setAiopsListState] = useState(restorableDefaults);
  const [globalState, setGlobalState] = useUrlState('_g');
  const [selectedField, setSelectedField] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [currentSavedSearch, setCurrentSavedSearch] = useState(savedSearch);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  const [sparkLines, setSparkLines] = useState<SparkLinesPerCategory>({});

  useEffect(() => {
    if (savedSearch) {
      setCurrentSavedSearch(savedSearch);
    }
  }, [savedSearch]);

  useEffect(
    function cancelRequestOnLeave() {
      return () => {
        cancelRequest();
      };
    },
    [cancelRequest]
  );

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

  const {
    documentStats,
    timefilter,
    earliest,
    latest,
    searchQueryLanguage,
    searchString,
    searchQuery,
    intervalMs,
  } = useData(
    { currentDataView: dataView, currentSavedSearch },
    aiopsListState,
    setGlobalState,
    undefined,
    undefined,
    BAR_TARGET
  );

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.time), timefilter]);

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

  useEffect(
    function setSingleFieldAsSelected() {
      if (fields.length === 1) {
        setSelectedField(fields[0].label);
      }
    },
    [fields]
  );

  useEffect(() => {
    if (documentStats.documentCountStats?.buckets) {
      setEventRate(
        Object.entries(documentStats.documentCountStats.buckets).map(([key, docCount]) => ({
          key: +key,
          docCount,
        }))
      );
      setCategories(null);
      setTotalCount(documentStats.totalCount);
    }
  }, [documentStats, earliest, latest, searchQueryLanguage, searchString, searchQuery]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setCategories(null);
    const { title: index, timeFieldName: timeField } = dataView;

    if (selectedField === undefined || timeField === undefined) {
      return;
    }

    cancelRequest();

    try {
      const resp = await runCategorizeRequest(
        index,
        selectedField,
        timeField,
        earliest,
        latest,
        searchQuery,
        intervalMs
      );

      setCategories(resp.categories);
      setSparkLines(resp.sparkLinesPerCategory);
    } catch (error) {
      toasts.addError(error, {
        title: i18n.translate('xpack.aiops.logCategorization.errorLoadingCategories', {
          defaultMessage: 'Error loading categories',
        }),
      });
    }

    setLoading(false);
  }, [
    selectedField,
    dataView,
    searchQuery,
    earliest,
    latest,
    runCategorizeRequest,
    cancelRequest,
    intervalMs,
    toasts,
  ]);

  const onFieldChange = (value: EuiComboBoxOptionOption[] | undefined) => {
    setCategories(null);
    setSelectedField(value && value.length ? value[0].label : undefined);
  };

  return (
    <EuiPageBody data-test-subj="aiopsLogCategorizationPage" paddingSize="none" panelled={false}>
      <PageHeader />
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
        <EuiFlexItem grow={false} css={{ minWidth: '410px' }}>
          <EuiFormRow
            label={i18n.translate('xpack.aiops.logCategorization.categoryFieldSelect', {
              defaultMessage: 'Category field',
            })}
          >
            <EuiComboBox
              isDisabled={loading === true}
              options={fields}
              onChange={onFieldChange}
              selectedOptions={selectedField === undefined ? undefined : [{ label: selectedField }]}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ marginTop: 'auto' }}>
          {loading === false ? (
            <EuiButton
              disabled={selectedField === undefined}
              onClick={() => {
                loadCategories();
              }}
            >
              <FormattedMessage
                id="xpack.aiops.logCategorization.runButton"
                defaultMessage="Run categorization"
              />
            </EuiButton>
          ) : (
            <EuiButton onClick={() => cancelRequest()}>Cancel</EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ marginTop: 'auto' }} />
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
            documentCountStats={documentStats.documentCountStats}
          />
          <EuiSpacer />
        </>
      ) : null}

      {loading === true ? <EuiLoadingContent lines={10} /> : null}

      <InformationText
        loading={loading}
        categoriesLength={categories?.length ?? null}
        eventRateLength={eventRate.length}
        fieldSelected={selectedField !== null}
      />

      {selectedField !== undefined && categories !== null && categories.length > 0 ? (
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
