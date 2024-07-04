/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { buildEmptyFilter } from '@kbn/es-query';
import type { FieldValidationResults } from '@kbn/ml-category-validator';

import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import type { EmbeddablePatternAnalysisInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
import { useTableState } from '@kbn/ml-in-memory-table/hooks/use_table_state';
import { AIOPS_TELEMETRY_ID } from '@kbn/aiops-common/constants';
import { useFilterQueryUpdates } from '../../../hooks/use_filters_query';
import type { PatternAnalysisProps } from '../../../shared_components/pattern_analysis';
import { useSearch } from '../../../hooks/use_search';
import { getDefaultLogCategorizationAppState } from '../../../application/url_state/log_pattern_analysis';
import { createMergedEsQuery } from '../../../application/utils/search_utils';
import { useData } from '../../../hooks/use_data';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

import { useCategorizeRequest } from '../use_categorize_request';
import type { EventRate } from '../use_categorize_request';
import { CategoryTable } from '../category_table';
import { LoadingCategorization } from '../loading_categorization';
import { useValidateFieldRequest } from '../use_validate_category_field';
import { useMinimumTimeRange } from './use_minimum_time_range';

import { createAdditionalConfigHash, createDocumentStatsHash } from '../utils';
import { useOpenInDiscover } from '../category_table/use_open_in_discover';
import { FieldValidationCallout } from '../category_validation_callout';

export interface LogCategorizationEmbeddableProps {
  input: Readonly<EmbeddablePatternAnalysisInput & PatternAnalysisProps>;
}

const BAR_TARGET = 20;

export const LogCategorizationEmbeddable: FC<LogCategorizationEmbeddableProps> = ({ input }) => {
  const {
    notifications: { toasts },
    data: {
      query: { filterManager },
    },
    uiSettings,
    embeddingOrigin,
  } = useAiopsAppContext();

  const {
    dataView,
    savedSearch,
    fieldName,
    minimumTimeRangeOption,
    randomSamplerMode,
    randomSamplerProbability,
    onChange,
    onRenderComplete,
  } = input;
  const { filters, query } = useFilterQueryUpdates();

  const { runValidateFieldRequest, cancelRequest: cancelValidationRequest } =
    useValidateFieldRequest();
  const { getMinimumTimeRange, cancelRequest: cancelWiderTimeRangeRequest } = useMinimumTimeRange();

  const mounted = useRef(false);
  const {
    runCategorizeRequest,
    cancelRequest: cancelCategorizationRequest,
    randomSampler,
  } = useCategorizeRequest({
    randomSamplerMode,
    setRandomSamplerMode: () => {},
    randomSamplerProbability,
    setRandomSamplerProbability: () => {},
  });

  const appState = getDefaultLogCategorizationAppState({
    searchQuery: createMergedEsQuery(query, filters, dataView, uiSettings),
    filters,
  });
  const { searchQuery } = useSearch({ dataView, savedSearch: savedSearch ?? null }, appState, true);

  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [currentDocumentStatsHash, setCurrentDocumentStatsHash] = useState<number | null>(null);
  const [previousDocumentStatsHash, setPreviousDocumentStatsHash] = useState<number>(0);
  const [currentAdditionalConfigsHash, setCurrentAdditionalConfigsHash] = useState<number | null>(
    null
  );
  const [previousAdditionalConfigsHash, setPreviousAdditionalConfigsHash] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState<boolean | null>(null);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [data, setData] = useState<{
    categories: Category[];
    displayExamples: boolean;
    totalCategories: number;
  } | null>(null);
  const [fieldValidationResult, setFieldValidationResult] = useState<FieldValidationResults | null>(
    null
  );
  const tableState = useTableState<Category>([], 'key');

  useEffect(
    function initFields() {
      setCurrentDocumentStatsHash(null);
      setLoading(null);
    },
    [dataView]
  );

  const cancelRequest = useCallback(() => {
    cancelWiderTimeRangeRequest();
    cancelValidationRequest();
    cancelCategorizationRequest();
  }, [cancelCategorizationRequest, cancelValidationRequest, cancelWiderTimeRangeRequest]);

  useEffect(
    function cancelRequestOnLeave() {
      mounted.current = true;
      return () => {
        mounted.current = false;
        cancelRequest();
      };
    },
    [cancelRequest, mounted]
  );

  const { documentStats, timefilter, earliest, latest, intervalMs, forceRefresh } = useData(
    dataView,
    'log_categorization',
    searchQuery,
    () => {},
    undefined,
    undefined,
    BAR_TARGET,
    false
  );

  useEffect(
    function forceRefreshDataViewChange() {
      if (currentDocumentStatsHash === null) {
        forceRefresh();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentDocumentStatsHash]
  );

  const onAddFilter = useCallback(
    (values: Filter, alias?: string) => {
      const filter = buildEmptyFilter(false, dataView.id);
      if (alias) {
        filter.meta.alias = alias;
      }
      filter.query = values.query;
      filterManager.addFilters([filter]);
    },
    [dataView.id, filterManager]
  );

  const openInDiscover = useOpenInDiscover(
    dataView.id!,
    dataView.fields.find((field) => field.name === fieldName),
    selectedCategories,
    appState,
    timefilter,
    false,
    onAddFilter,
    undefined
  );

  useEffect(
    function createDocumentStatHash() {
      if (documentStats.documentCountStats === undefined) {
        return;
      }

      const hash = createDocumentStatsHash(documentStats);
      if (hash !== previousDocumentStatsHash) {
        setCurrentDocumentStatsHash(hash);
        setData(null);
        setFieldValidationResult(null);
      }
    },
    [documentStats, previousDocumentStatsHash]
  );

  useEffect(
    function createAdditionalConfigHash2() {
      if (!fieldName) {
        return;
      }

      const hash = createAdditionalConfigHash([
        dataView.name,
        fieldName,
        minimumTimeRangeOption,
        randomSamplerMode,
        String(randomSamplerProbability ?? ''),
      ]);
      if (hash !== previousAdditionalConfigsHash) {
        setCurrentAdditionalConfigsHash(hash);
        setData(null);
        setFieldValidationResult(null);
      }
    },
    [
      dataView.name,
      fieldName,
      minimumTimeRangeOption,
      previousAdditionalConfigsHash,
      randomSamplerMode,
      randomSamplerProbability,
    ]
  );

  const loadCategories = useCallback(async () => {
    const { getIndexPattern, timeFieldName: timeField } = dataView;
    const index = getIndexPattern();

    if (
      loading === true ||
      fieldName === null ||
      timeField === undefined ||
      earliest === undefined ||
      latest === undefined ||
      minimumTimeRangeOption === undefined ||
      mounted.current !== true
    ) {
      return;
    }

    cancelRequest();

    setLoading(true);
    setData(null);
    setFieldValidationResult(null);

    const additionalFilter: CategorizationAdditionalFilter = {
      from: earliest,
      to: latest,
    };

    try {
      const timeRange = await getMinimumTimeRange(
        index,
        timeField,
        additionalFilter,
        minimumTimeRangeOption,
        searchQuery
      );

      if (mounted.current !== true) {
        return;
      }

      const [validationResult, categorizationResult] = await Promise.all([
        runValidateFieldRequest(index, fieldName, timeField, timeRange, searchQuery, {
          [AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN]: embeddingOrigin,
        }),
        runCategorizeRequest(
          index,
          fieldName,
          timeField,
          { to: timeRange.to, from: timeRange.from },
          searchQuery,
          intervalMs,
          timeRange.useSubAgg ? additionalFilter : undefined
        ),
      ]);

      if (mounted.current !== true) {
        return;
      }

      setFieldValidationResult(validationResult);
      const { categories, hasExamples } = categorizationResult;

      if (timeRange.useSubAgg) {
        const categoriesInBucket = categorizationResult.categories
          .map((category) => ({
            ...category,
            count: category.subFieldCount ?? category.subTimeRangeCount!,
            examples: category.subFieldExamples!,
            sparkline: category.subFieldSparkline,
          }))
          .filter((category) => category.count > 0)
          .sort((a, b) => b.count - a.count);
        setData({
          categories: categoriesInBucket,
          displayExamples: hasExamples,
          totalCategories: categories.length,
        });
      } else {
        setData({
          categories,
          displayExamples: hasExamples,
          totalCategories: categories.length,
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // ignore error
      } else {
        toasts.addError(error, {
          title: i18n.translate('xpack.aiops.logCategorization.errorLoadingCategories', {
            defaultMessage: 'Error loading categories',
          }),
        });
      }
    }

    if (mounted.current === true) {
      setLoading(false);
    }
  }, [
    cancelRequest,
    dataView,
    earliest,
    embeddingOrigin,
    fieldName,
    getMinimumTimeRange,
    intervalMs,
    latest,
    loading,
    minimumTimeRangeOption,
    runCategorizeRequest,
    runValidateFieldRequest,
    searchQuery,
    toasts,
  ]);

  useEffect(
    function setOnChange() {
      if (typeof onChange === 'function') {
        onChange(data?.categories ?? []);
      }
      if (data !== null) {
        onRenderComplete();
      }
    },
    [data, onChange, onRenderComplete]
  );

  useEffect(
    function triggerAnalysis() {
      const buckets = documentStats.documentCountStats?.buckets;
      if (buckets === undefined || currentDocumentStatsHash === null) {
        return;
      }

      if (
        currentDocumentStatsHash !== previousDocumentStatsHash ||
        (currentAdditionalConfigsHash !== previousAdditionalConfigsHash &&
          currentDocumentStatsHash !== null)
      ) {
        randomSampler.setDocCount(documentStats.totalCount);
        setEventRate(
          Object.entries(buckets).map(([key, docCount]) => ({
            key: +key,
            docCount,
          }))
        );
        loadCategories();
        setPreviousDocumentStatsHash(currentDocumentStatsHash);
        setPreviousAdditionalConfigsHash(currentAdditionalConfigsHash);
      }
    },
    [
      loadCategories,
      randomSampler,
      previousDocumentStatsHash,
      fieldValidationResult,
      currentDocumentStatsHash,
      currentAdditionalConfigsHash,
      documentStats.documentCountStats?.buckets,
      documentStats.totalCount,
      previousAdditionalConfigsHash,
      dataView.name,
    ]
  );

  useEffect(
    function refreshTriggeredFromButton() {
      if (input.lastReloadRequestTime !== undefined) {
        setPreviousDocumentStatsHash(0);
        setPreviousAdditionalConfigsHash(null);
        forceRefresh();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.lastReloadRequestTime]
  );

  return (
    <>
      <FieldValidationCallout validationResults={fieldValidationResult} />
      {(loading ?? true) === true ? <LoadingCategorization onCancel={cancelRequest} /> : null}

      {loading === false && data !== null && data.categories.length > 0 && fieldName !== null ? (
        <CategoryTable
          categories={data.categories}
          eventRate={eventRate}
          enableRowActions={false}
          displayExamples={data.displayExamples}
          setSelectedCategories={setSelectedCategories}
          openInDiscover={openInDiscover}
          tableState={tableState}
          selectable={false}
        />
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogCategorizationEmbeddable;
