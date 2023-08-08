/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiSkeletonText,
} from '@elastic/eui';

import { Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePageUrlState, useUrlState } from '@kbn/ml-url-state';

import type { FieldValidationResults } from '@kbn/ml-category-validator';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { useDataSource } from '../../hooks/use_data_source';
import { useData } from '../../hooks/use_data';
import { useSearch } from '../../hooks/use_search';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import {
  getDefaultLogCategorizationAppState,
  type LogCategorizationPageUrlState,
} from '../../application/utils/url_state';

import { SearchPanel } from '../search_panel';
import { PageHeader } from '../page_header';

import type { EventRate, Category, SparkLinesPerCategory } from './use_categorize_request';
import { useCategorizeRequest } from './use_categorize_request';
import { CategoryTable } from './category_table';
import { DocumentCountChart } from './document_count_chart';
import { InformationText } from './information_text';
import { SamplingMenu } from './sampling_menu';
import { useValidateFieldRequest } from './use_validate_category_field';
import { FieldValidationCallout } from './category_validation_callout';

const BAR_TARGET = 20;
const DEFAULT_SELECTED_FIELD = 'message';

export const LogCategorizationPage: FC = () => {
  const {
    notifications: { toasts },
  } = useAiopsAppContext();
  const { dataView, savedSearch } = useDataSource();

  const {
    runCategorizeRequest,
    cancelRequest: cancelCategorizationRequest,
    randomSampler,
  } = useCategorizeRequest();
  const { runValidateFieldRequest, cancelRequest: cancelValidationRequest } =
    useValidateFieldRequest();
  const [stateFromUrl, setUrlState] = usePageUrlState<LogCategorizationPageUrlState>(
    'logCategorization',
    getDefaultLogCategorizationAppState()
  );
  const [globalState, setGlobalState] = useUrlState('_g');
  const [selectedField, setSelectedField] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSavedSearch, setSelectedDataView] = useState(savedSearch);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  const [data, setData] = useState<{
    categories: Category[];
    sparkLines: SparkLinesPerCategory;
  } | null>(null);
  const [fieldValidationResult, setFieldValidationResult] = useState<FieldValidationResults | null>(
    null
  );

  const cancelRequest = useCallback(() => {
    cancelValidationRequest();
    cancelCategorizationRequest();
  }, [cancelCategorizationRequest, cancelValidationRequest]);

  useEffect(() => {
    if (savedSearch) {
      setSelectedDataView(savedSearch);
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
      searchQuery: estypes.QueryDslQueryContainer;
      searchString: Query['query'];
      queryLanguage: SearchQueryLanguage;
      filters: Filter[];
    }) => {
      // When the user loads saved search and then clear or modify the query
      // we should remove the saved search and replace it with the index pattern id
      if (selectedSavedSearch !== null) {
        setSelectedDataView(null);
      }

      setUrlState({
        ...stateFromUrl,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [selectedSavedSearch, stateFromUrl, setUrlState]
  );

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch: selectedSavedSearch },
    stateFromUrl
  );

  const { documentStats, timefilter, earliest, latest, intervalMs } = useData(
    dataView,
    'log_categorization',
    searchQuery,
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

  useEffect(() => {
    if (documentStats.documentCountStats?.buckets) {
      randomSampler.setDocCount(documentStats.totalCount);
      setEventRate(
        Object.entries(documentStats.documentCountStats.buckets).map(([key, docCount]) => ({
          key: +key,
          docCount,
        }))
      );
      setData(null);
      setFieldValidationResult(null);
      setTotalCount(documentStats.totalCount);
    }
  }, [
    documentStats,
    earliest,
    latest,
    searchQueryLanguage,
    searchString,
    searchQuery,
    randomSampler,
  ]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setData(null);
    setFieldValidationResult(null);

    const { getIndexPattern, timeFieldName: timeField } = dataView;
    const index = getIndexPattern();

    if (selectedField === undefined || timeField === undefined) {
      setLoading(false);
      return;
    }

    cancelRequest();

    try {
      const [validationResult, categorizationResult] = await Promise.all([
        runValidateFieldRequest(index, selectedField, timeField, earliest, latest, searchQuery),
        runCategorizeRequest(
          index,
          selectedField,
          timeField,
          earliest,
          latest,
          searchQuery,
          intervalMs
        ),
      ]);

      setFieldValidationResult(validationResult);
      setData({
        categories: categorizationResult.categories,
        sparkLines: categorizationResult.sparkLinesPerCategory,
      });
    } catch (error) {
      toasts.addError(error, {
        title: i18n.translate('xpack.aiops.logCategorization.errorLoadingCategories', {
          defaultMessage: 'Error loading categories',
        }),
      });
    }

    setLoading(false);
  }, [
    dataView,
    selectedField,
    cancelRequest,
    runValidateFieldRequest,
    earliest,
    latest,
    searchQuery,
    runCategorizeRequest,
    intervalMs,
    toasts,
  ]);

  useEffect(
    function autoSelectField() {
      if (selectedField !== undefined) {
        return;
      }

      const field = stateFromUrl.field;
      if (field !== undefined && fields.find((f) => f.label === field)) {
        // select field from URL, if it exists
        setSelectedField(field);
      } else if (fields.length === 1) {
        // otherwise, if there is only one field in the list, select it
        setSelectedField(fields[0].label);
      } else if (fields.find((f) => f.label === DEFAULT_SELECTED_FIELD)) {
        // otherwise, if there is a field called `message`, select it
        setSelectedField(DEFAULT_SELECTED_FIELD);
      }
    },
    [fields, loadCategories, selectedField, stateFromUrl.field]
  );

  const onFieldChange = (value: EuiComboBoxOptionOption[] | undefined) => {
    setData(null);
    setFieldValidationResult(null);
    const field = value && value.length ? value[0].label : undefined;
    setSelectedField(field);
    setUrlState({ field });
  };

  return (
    <EuiPageBody data-test-subj="aiopsLogPatternAnalysisPage" paddingSize="none" panelled={false}>
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
              data-test-subj="aiopsLogPatternAnalysisCategoryField"
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
              data-test-subj="aiopsLogPatternAnalysisRunButton"
            >
              <FormattedMessage
                id="xpack.aiops.logCategorization.runButton"
                defaultMessage="Run pattern analysis"
              />
            </EuiButton>
          ) : (
            <EuiButton onClick={() => cancelRequest()}>Cancel</EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false} css={{ marginTop: 'auto' }}>
          <SamplingMenu randomSampler={randomSampler} reload={() => loadCategories()} />
        </EuiFlexItem>
      </EuiFlexGroup>

      {eventRate.length ? (
        <>
          <EuiSpacer />
          <DocumentCountChart
            eventRate={eventRate}
            pinnedCategory={pinnedCategory}
            selectedCategory={selectedCategory}
            sparkLines={data?.sparkLines ?? {}}
            totalCount={totalCount}
            documentCountStats={documentStats.documentCountStats}
          />
          <EuiSpacer />
        </>
      ) : null}

      <FieldValidationCallout validationResults={fieldValidationResult} />

      {loading === true ? <EuiSkeletonText lines={10} /> : null}

      <InformationText
        loading={loading}
        categoriesLength={data?.categories?.length ?? null}
        eventRateLength={eventRate.length}
        fieldSelected={selectedField !== null}
      />

      {selectedField !== undefined && data !== null && data.categories.length > 0 ? (
        <CategoryTable
          categories={data.categories}
          aiopsListState={stateFromUrl}
          dataViewId={dataView.id!}
          eventRate={eventRate}
          sparkLines={data.sparkLines}
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
