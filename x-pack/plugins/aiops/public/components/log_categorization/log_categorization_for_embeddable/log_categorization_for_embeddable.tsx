/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import type { DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { buildEmptyFilter } from '@kbn/es-query';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { FieldValidationResults } from '@kbn/ml-category-validator';

import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import { AIOPS_TELEMETRY_ID } from '@kbn/aiops-common/constants';
import type { EmbeddableLogCategorizationInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
import {
  type LogCategorizationPageUrlState,
  getDefaultLogCategorizationAppState,
} from '../../../application/url_state/log_pattern_analysis';
import { createMergedEsQuery } from '../../../application/utils/search_utils';
import { useData } from '../../../hooks/use_data';
import { useSearch } from '../../../hooks/use_search';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

import { useCategorizeRequest } from '../use_categorize_request';
import type { EventRate } from '../use_categorize_request';
import { CategoryTable } from '../category_table';
import { InformationText } from '../information_text';
import { LoadingCategorization } from '../loading_categorization';
import { useValidateFieldRequest } from '../use_validate_category_field';
import { FieldValidationCallout } from '../category_validation_callout';
import { EmbeddableMenu } from './embeddable_menu';
import { useMinimumTimeRange } from './use_minimum_time_range';

import { createAdditionalConfigHash, createDocumentStatsHash, getMessageField } from '../utils';
import { useOpenInDiscover } from '../category_table/use_open_in_discover';
import { OpenInDiscoverButtons } from '../category_table/table_header';

export interface LogCategorizationPageProps {
  onClose: () => void;
  embeddingOrigin: string;
  additionalFilter?: CategorizationAdditionalFilter;
  input: Readonly<EmbeddableLogCategorizationInput>;
}

const BAR_TARGET = 20;

export const LogCategorizationEmbeddable: FC<LogCategorizationPageProps> = ({
  onClose,
  embeddingOrigin,
  additionalFilter,
  input,
}) => {
  const {
    notifications: { toasts },
    data: {
      query: { getState, filterManager },
    },
    uiSettings,
  } = useAiopsAppContext();
  const { dataView, savedSearch, setPatternCount, setOptionsMenu } = input;

  const { runValidateFieldRequest, cancelRequest: cancelValidationRequest } =
    useValidateFieldRequest();
  const {
    getMinimumTimeRange,
    cancelRequest: cancelWiderTimeRangeRequest,
    minimumTimeRangeOption,
    setMinimumTimeRangeOption,
  } = useMinimumTimeRange();
  const { filters, query } = useMemo(() => getState(), [getState]);

  const mounted = useRef(false);
  const {
    runCategorizeRequest,
    cancelRequest: cancelCategorizationRequest,
    randomSampler,
  } = useCategorizeRequest();
  const [stateFromUrl] = usePageUrlState<LogCategorizationPageUrlState>(
    'logCategorization',
    getDefaultLogCategorizationAppState({
      searchQuery: createMergedEsQuery(query, filters, dataView, uiSettings),
    })
  );
  const [highlightedCategory, setHighlightedCategory] = useState<Category | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedField, setSelectedField] = useState<DataViewField | null>(null);
  const [fields, setFields] = useState<DataViewField[]>([]);
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
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  const [data, setData] = useState<{
    categories: Category[];
    displayExamples: boolean;
    totalCategories: number;
  } | null>(null);
  const [fieldValidationResult, setFieldValidationResult] = useState<FieldValidationResults | null>(
    null
  );

  useEffect(
    function initFields() {
      setCurrentDocumentStatsHash(null);
      setSelectedField(null);
      setLoading(null);
      const { dataViewFields, messageField } = getMessageField(dataView);
      setFields(dataViewFields);
      setSelectedField(messageField);
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
        setPatternCount(undefined);
      };
    },
    [cancelRequest, mounted, setPatternCount]
  );

  const { searchQuery } = useSearch(
    { dataView, savedSearch: savedSearch ?? null },
    stateFromUrl,
    true
  );

  const { documentStats, timefilter, earliest, latest, intervalMs, forceRefresh } = useData(
    dataView,
    'log_categorization',
    searchQuery,
    () => {},
    undefined,
    undefined,
    BAR_TARGET
  );

  const onAddFilter = useCallback(
    (values: Filter, alias?: string) => {
      if (input.onAddFilter === undefined) {
        return;
      }

      const filter = buildEmptyFilter(false, dataView.id);
      if (alias) {
        filter.meta.alias = alias;
      }
      filter.query = values.query;
      if (onAddFilter !== undefined) {
        input.onAddFilter();
      }
      filterManager.addFilters([filter]);
    },
    [dataView.id, filterManager, input]
  );

  const openInDiscover = useOpenInDiscover(
    dataView.id!,
    selectedField?.displayName ?? undefined,
    selectedCategories,
    stateFromUrl,
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
      if (!selectedField?.name) {
        return;
      }

      const hash = createAdditionalConfigHash([selectedField.name, minimumTimeRangeOption]);
      if (hash !== previousAdditionalConfigsHash) {
        setCurrentAdditionalConfigsHash(hash);
        setData(null);
        setFieldValidationResult(null);
      }
    },
    [minimumTimeRangeOption, previousAdditionalConfigsHash, selectedField]
  );

  const loadCategories = useCallback(async () => {
    const { getIndexPattern, timeFieldName: timeField } = dataView;
    const index = getIndexPattern();

    if (
      loading === true ||
      selectedField === null ||
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

    const tempAdditionalFilter: CategorizationAdditionalFilter = {
      from: earliest,
      to: latest,
    };

    const timeRange = await getMinimumTimeRange(
      index,
      timeField,
      tempAdditionalFilter,
      minimumTimeRangeOption,
      searchQuery
    );

    if (mounted.current !== true) {
      return;
    }

    try {
      const [validationResult, categorizationResult] = await Promise.all([
        runValidateFieldRequest(index, selectedField.name, timeField, timeRange, searchQuery, {
          [AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN]: embeddingOrigin,
        }),
        runCategorizeRequest(
          index,
          selectedField.name,
          timeField,
          { to: timeRange.to, from: timeRange.from },
          searchQuery,
          intervalMs,
          timeRange.useSubAgg ? tempAdditionalFilter : undefined
        ),
      ]);
      // eslint-disable-next-line no-console
      console.log('categorizationResult', categorizationResult);

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
      toasts.addError(error, {
        title: i18n.translate('xpack.aiops.logCategorization.errorLoadingCategories', {
          defaultMessage: 'Error loading categories',
        }),
      });
    }

    if (mounted.current === true) {
      setLoading(false);
    }
  }, [
    dataView,
    loading,
    selectedField,
    earliest,
    latest,
    minimumTimeRangeOption,
    cancelRequest,
    getMinimumTimeRange,
    searchQuery,
    runValidateFieldRequest,
    embeddingOrigin,
    runCategorizeRequest,
    intervalMs,
    toasts,
  ]);

  useEffect(
    function initOptionsMenu() {
      setPatternCount(data?.categories.length);
      setOptionsMenu(
        <>
          {randomSampler !== undefined ? (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="none">
                {selectedCategories.length > 0 ? (
                  <EuiFlexItem>
                    <OpenInDiscoverButtons openInDiscover={openInDiscover} showText={false} />
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem>
                  <EmbeddableMenu
                    randomSampler={randomSampler}
                    reload={() => loadCategories()}
                    fields={fields}
                    setSelectedField={setSelectedField}
                    selectedField={selectedField}
                    minimumTimeRangeOption={minimumTimeRangeOption}
                    setMinimumTimeRangeOption={setMinimumTimeRangeOption}
                    categoryCount={data?.totalCategories}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : null}
        </>
      );
      return () => {
        setPatternCount(undefined);
        setOptionsMenu(undefined);
      };
    },
    [
      data,
      fields,
      loadCategories,
      randomSampler,
      selectedField,
      setOptionsMenu,
      setPatternCount,
      setMinimumTimeRangeOption,
      minimumTimeRangeOption,
      selectedCategories.length,
      openInDiscover,
    ]
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
        // eslint-disable-next-line no-console
        console.log('trigger', currentDocumentStatsHash, previousDocumentStatsHash);
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
      } else {
        // eslint-disable-next-line no-console
        console.log('no trigger', currentDocumentStatsHash, previousDocumentStatsHash);
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
    ]
  );

  useEffect(
    function refreshTriggeredFromButton() {
      if (input?.lastReloadRequestTime !== undefined) {
        setPreviousDocumentStatsHash(0);
        setPreviousAdditionalConfigsHash(null);
        forceRefresh();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input?.lastReloadRequestTime]
  );

  return (
    <>
      <EuiFlexGroup
        className="eui-fullHeight"
        direction="column"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem css={{ position: 'relative', overflowY: 'auto' }}>
          <>
            <FieldValidationCallout validationResults={fieldValidationResult} />
            {(loading ?? true) === true ? <LoadingCategorization onCancel={cancelRequest} /> : null}
            <InformationText
              loading={loading ?? true}
              categoriesLength={data?.categories?.length ?? null}
              eventRateLength={eventRate.length}
              fields={fields}
            />
            {loading === false &&
            data !== null &&
            data.categories.length > 0 &&
            selectedField !== null ? (
              <CategoryTable
                categories={data.categories}
                eventRate={eventRate}
                pinnedCategory={pinnedCategory}
                setPinnedCategory={setPinnedCategory}
                highlightedCategory={highlightedCategory}
                setHighlightedCategory={setHighlightedCategory}
                enableRowActions={false}
                displayExamples={data.displayExamples}
                setSelectedCategories={setSelectedCategories}
                openInDiscover={openInDiscover}
              />
            ) : null}
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
