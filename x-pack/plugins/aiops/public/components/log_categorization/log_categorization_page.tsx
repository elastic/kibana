/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiHorizontalRule } from '@elastic/eui';
import {
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiComboBox,
  EuiFormRow,
  EuiSkeletonText,
} from '@elastic/eui';

import type { Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePageUrlState, useUrlState } from '@kbn/ml-url-state';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { AIOPS_TELEMETRY_ID } from '@kbn/aiops-common/constants';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import { useTableState } from '@kbn/ml-in-memory-table/hooks/use_table_state';
import { useDataSource } from '../../hooks/use_data_source';
import { useData } from '../../hooks/use_data';
import { useSearch } from '../../hooks/use_search';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import {
  getDefaultLogCategorizationAppState,
  type LogCategorizationPageUrlState,
} from '../../application/url_state/log_pattern_analysis';

import { SearchPanel } from '../search_panel';
import { PageHeader } from '../page_header';

import type { EventRate } from './use_categorize_request';
import { useCategorizeRequest } from './use_categorize_request';
import { CategoryTable } from './category_table';
import { DocumentCountChart } from './document_count_chart';
import { InformationText } from './information_text';
import { SamplingMenu, useRandomSamplerStorage } from './sampling_menu';
import { useValidateFieldRequest } from './use_validate_category_field';
import { FieldValidationCallout } from './category_validation_callout';
import { createDocumentStatsHash } from './utils';
import { TableHeader } from './category_table/table_header';
import { useActions } from './category_table/use_actions';

const BAR_TARGET = 20;
const DEFAULT_SELECTED_FIELD = 'message';

interface LogCategorizationPageProps {
  /** Identifier to indicate the plugin utilizing the component */
  embeddingOrigin: string;
}

export const LogCategorizationPage: FC<LogCategorizationPageProps> = ({ embeddingOrigin }) => {
  const {
    notifications: { toasts },
  } = useAiopsAppContext();
  const { dataView, savedSearch } = useDataSource();

  const randomSamplerStorage = useRandomSamplerStorage();
  const {
    runCategorizeRequest,
    cancelRequest: cancelCategorizationRequest,
    randomSampler,
  } = useCategorizeRequest(randomSamplerStorage);
  const { runValidateFieldRequest, cancelRequest: cancelValidationRequest } =
    useValidateFieldRequest();
  const [stateFromUrl, setUrlState] = usePageUrlState<LogCategorizationPageUrlState>(
    'logCategorization',
    getDefaultLogCategorizationAppState()
  );
  const [globalState, setGlobalState] = useUrlState('_g');
  const [selectedField, setSelectedField] = useState<string | undefined>();
  const [highlightedCategory, setHighlightedCategory] = useState<Category | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedSavedSearch, setSelectedSavedSearch] = useState(savedSearch);
  const [previousDocumentStatsHash, setPreviousDocumentStatsHash] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  const [data, setData] = useState<{
    categories: Category[];
    displayExamples: boolean;
  } | null>(null);
  const [fieldValidationResult, setFieldValidationResult] = useState<FieldValidationResults | null>(
    null
  );
  const tableState = useTableState<Category>([], 'key');

  const cancelRequest = useCallback(() => {
    cancelValidationRequest();
    cancelCategorizationRequest();
  }, [cancelCategorizationRequest, cancelValidationRequest]);

  useEffect(() => {
    if (savedSearch) {
      setSelectedSavedSearch(savedSearch);
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
        setSelectedSavedSearch(null);
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

  const { getActions, openInDiscover } = useActions(
    dataView.id!,
    selectedField,
    selectedCategories,
    stateFromUrl,
    timefilter,
    undefined,
    undefined
  );

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
  }, [globalState?.time, timefilter]);

  const fields = useMemo(
    () =>
      dataView.fields
        .filter(
          ({ displayName, esTypes }) =>
            esTypes && esTypes.includes('text') && !['_id', '_index'].includes(displayName)
        )
        .map(({ displayName }) => ({
          label: displayName,
        })),
    [dataView]
  );

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setData(null);
    setFieldValidationResult(null);

    const { getIndexPattern, timeFieldName: timeField } = dataView;
    const index = getIndexPattern();

    if (
      selectedField === undefined ||
      timeField === undefined ||
      earliest === undefined ||
      latest === undefined
    ) {
      setLoading(false);
      return;
    }

    cancelRequest();

    const timeRange = {
      from: earliest,
      to: latest,
    };

    const runtimeMappings = dataView.getRuntimeMappings();

    try {
      const [validationResult, categorizationResult] = await Promise.all([
        runValidateFieldRequest(
          index,
          selectedField,
          timeField,
          timeRange,
          searchQuery,
          runtimeMappings,
          {
            [AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN]: embeddingOrigin,
          }
        ),

        runCategorizeRequest(
          index,
          selectedField,
          timeField,
          timeRange,
          searchQuery,
          runtimeMappings,
          intervalMs
        ),
      ]);

      setFieldValidationResult(validationResult);
      setData({
        categories: categorizationResult.categories,
        displayExamples: categorizationResult.hasExamples,
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
    embeddingOrigin,
  ]);

  useEffect(() => {
    const buckets = documentStats.documentCountStats?.buckets;
    if (buckets === undefined) {
      return;
    }

    const hash = createDocumentStatsHash(documentStats);
    if (hash !== previousDocumentStatsHash) {
      randomSampler.setDocCount(documentStats.totalCount);
      setEventRate(
        Object.entries(buckets).map(([key, docCount]) => ({
          key: +key,
          docCount,
        }))
      );
      setTotalCount(documentStats.totalCount);
      if (fieldValidationResult !== null) {
        loadCategories();
      }
    }
    setPreviousDocumentStatsHash(hash);
  }, [
    documentStats,
    earliest,
    latest,
    searchQueryLanguage,
    searchString,
    searchQuery,
    randomSampler,
    totalCount,
    previousDocumentStatsHash,
    fieldValidationResult,
    loadCategories,
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

  const actions = getActions(true);

  return (
    <EuiPageBody data-test-subj="aiopsLogPatternAnalysisPage" paddingSize="none" panelled={false}>
      <PageHeader />
      <EuiSpacer />
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <SearchPanel
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
            <EuiButton
              data-test-subj="aiopsLogCategorizationPageCancelButton"
              onClick={() => cancelRequest()}
            >
              Cancel
            </EuiButton>
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
            selectedCategory={highlightedCategory}
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
      />

      {selectedField !== undefined && data !== null && data.categories.length > 0 ? (
        <>
          <TableHeader
            categoriesCount={data.categories.length}
            selectedCategoriesCount={selectedCategories.length}
            openInDiscover={openInDiscover}
          />

          <EuiSpacer size="xs" />
          <EuiHorizontalRule margin="none" />

          <CategoryTable
            categories={data.categories}
            eventRate={eventRate}
            mouseOver={{
              pinnedCategory,
              setPinnedCategory,
              highlightedCategory,
              setHighlightedCategory,
            }}
            displayExamples={data.displayExamples}
            setSelectedCategories={setSelectedCategories}
            tableState={tableState}
            actions={actions}
          />
        </>
      ) : null}
    </EuiPageBody>
  );
};
