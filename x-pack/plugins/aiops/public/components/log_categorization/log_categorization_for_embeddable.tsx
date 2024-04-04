/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { buildEmptyFilter } from '@kbn/es-query';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
import useMount from 'react-use/lib/useMount';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { unitOfTime } from 'moment';
import moment from 'moment';
import { useStorage } from '@kbn/ml-local-storage';

import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import { AIOPS_TELEMETRY_ID } from '@kbn/aiops-common/constants';
import type { EmbeddableLogCategorizationInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
import {
  type LogCategorizationPageUrlState,
  getDefaultLogCategorizationAppState,
} from '../../application/url_state/log_pattern_analysis';
import { createMergedEsQuery } from '../../application/utils/search_utils';
import { useData } from '../../hooks/use_data';
import { useSearch } from '../../hooks/use_search';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { useCategorizeRequest } from './use_categorize_request';
import type { EventRate } from './use_categorize_request';
import { CategoryTable } from './category_table';
import { InformationText } from './information_text';
import { LoadingCategorization } from './loading_categorization';
import { useValidateFieldRequest } from './use_validate_category_field';
import { FieldValidationCallout } from './category_validation_callout';
import { EmbeddableMenu } from './embeddable_menu';
import { useWiderTimeRange } from './use_wider_time_range';
import type { AiOpsKey, AiOpsStorageMapped } from '../../types/storage';
import { AIOPS_PATTERN_ANALYSIS_WIDENESS_PREFERENCE } from '../../types/storage';
import { createDocumentStatsHash } from './utils';

enum SELECTED_TAB {
  BUCKET,
  FULL_TIME_RANGE,
}

export type WidenessOption = 'No minimum' | '1 week' | '1 month' | '3 months' | '6 months';

type Wideness = Record<WidenessOption, { factor: number; unit: unitOfTime.Base }>;

export const WIDENESS: Wideness = {
  'No minimum': { factor: 0, unit: 'w' },
  '1 week': { factor: 1, unit: 'w' },
  '1 month': { factor: 1, unit: 'M' },
  '3 months': { factor: 3, unit: 'M' },
  '6 months': { factor: 6, unit: 'M' },
};

export interface LogCategorizationPageProps {
  onClose: () => void;
  /** Identifier to indicate the plugin utilizing the component */
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
  // const getViewModeToggle: (patternCount: number) => React.ReactElement | undefined =
  //   input.getViewModeToggle;

  const [widenessOption, setWidenessOption] = useStorage<
    AiOpsKey,
    AiOpsStorageMapped<typeof AIOPS_PATTERN_ANALYSIS_WIDENESS_PREFERENCE>
  >(AIOPS_PATTERN_ANALYSIS_WIDENESS_PREFERENCE, '1 week');

  const { runValidateFieldRequest, cancelRequest: cancelValidationRequest } =
    useValidateFieldRequest();
  const { getWiderTimeRange, cancelRequest: cancelWiderTimeRangeRequest } = useWiderTimeRange();
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
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedField, setSelectedField] = useState<DataViewField | null>(null);
  const [fields, setFields] = useState<DataViewField[]>([]);
  const [previousDocumentStatsHash, setPreviousDocumentStatsHash] = useState<number>(0);
  const [loading, setLoading] = useState(true);
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
  const [selectedTab, setSelectedTab] = useState<SELECTED_TAB>(SELECTED_TAB.FULL_TIME_RANGE);

  const cancelRequest = useCallback(() => {
    cancelWiderTimeRangeRequest();
    cancelValidationRequest();
    cancelCategorizationRequest();
  }, [cancelCategorizationRequest, cancelValidationRequest, cancelWiderTimeRangeRequest]);

  useMount(function loadFields() {
    const dataViewFields = dataView.fields.filter((f) => f.esTypes?.includes(ES_FIELD_TYPES.TEXT));
    setFields(dataViewFields);
    let messageField = dataViewFields.find((f) => f.name === 'message');
    if (messageField === undefined) {
      messageField = dataViewFields.find((f) => f.name === 'error.message');
    }
    if (messageField === undefined) {
      messageField = dataViewFields.find((f) => f.name === 'event.original ');
    }
    if (messageField === undefined) {
      messageField = dataViewFields[0];
    }
    if (messageField !== undefined) {
      setSelectedField(messageField);
    }
  });

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

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
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

  const loadCategories = useCallback(async () => {
    // eslint-disable-next-line no-console
    console.log('loadCategories');

    const { getIndexPattern, timeFieldName: timeField } = dataView;
    const index = getIndexPattern();

    if (
      selectedField === null ||
      timeField === undefined ||
      earliest === undefined ||
      latest === undefined ||
      widenessOption === undefined
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

    const timeRange = await getWiderTimeRange(
      index,
      timeField,
      tempAdditionalFilter,
      widenessOption,
      searchQuery
    );
    // eslint-disable-next-line no-console
    console.log(
      'sub agg  s',
      moment(tempAdditionalFilter.from).toISOString(),
      moment(tempAdditionalFilter.to).toISOString()
    );

    // eslint-disable-next-line no-console
    console.log(
      'full range',
      moment(timeRange.from).toISOString(),
      moment(timeRange.to).toISOString()
    );

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

      if (mounted.current === true) {
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

        // eslint-disable-next-line no-console
        console.log('categories', categories);
        setSelectedTab(SELECTED_TAB.BUCKET);
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
    selectedField,
    earliest,
    latest,
    cancelRequest,
    getWiderTimeRange,
    widenessOption,
    searchQuery,
    runValidateFieldRequest,
    embeddingOrigin,
    runCategorizeRequest,
    intervalMs,
    toasts,
  ]);

  useEffect(() => {
    setPatternCount(data?.categories.length);
    setOptionsMenu(
      <>
        {randomSampler !== undefined ? (
          <EmbeddableMenu
            randomSampler={randomSampler}
            reload={() => loadCategories()}
            fields={fields}
            setSelectedField={setSelectedField}
            selectedField={selectedField}
            widenessOption={widenessOption}
            setWidenessOption={setWidenessOption}
            categoryCount={data?.totalCategories}
          />
        ) : null}
      </>
    );
    return () => {
      setOptionsMenu(undefined);
    };
  }, [
    data,
    fields,
    loadCategories,
    randomSampler,
    selectedField,
    setOptionsMenu,
    setPatternCount,
    setWidenessOption,
    widenessOption,
  ]);

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

  useEffect(() => {
    const buckets = documentStats.documentCountStats?.buckets;
    if (buckets === undefined || selectedField === null) {
      return;
    }

    const hash = createDocumentStatsHash(documentStats, [selectedField.name, widenessOption]);
    if (hash !== previousDocumentStatsHash) {
      randomSampler.setDocCount(documentStats.totalCount);
      setEventRate(
        Object.entries(buckets).map(([key, docCount]) => ({
          key: +key,
          docCount,
        }))
      );
      loadCategories();
      setPreviousDocumentStatsHash(hash);
    }
  }, [
    documentStats,
    earliest,
    latest,
    searchQueryLanguage,
    searchString,
    searchQuery,
    loadCategories,
    randomSampler,
    previousDocumentStatsHash,
    fieldValidationResult,
    selectedField,
    widenessOption,
  ]);

  useEffect(
    function refreshTriggeredFromButton() {
      if (input?.lastReloadRequestTime !== undefined) {
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
        {/* <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <>{getViewModeToggle(data?.categories?.length ?? 0)}</>
            <EuiFlexItem />
            <EuiFlexItem grow={false}>
              {randomSampler !== undefined ? (
                <EmbeddableMenu
                  randomSampler={randomSampler}
                  reload={() => loadCategories()}
                  fields={fields}
                  setSelectedField={setSelectedField}
                  selectedField={selectedField}
                  widenessOption={widenessOption}
                  setWidenessOption={setWidenessOption}
                  categoryCount={data?.totalCategories}
                />
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem> */}

        <EuiFlexItem
          aria-labelledby="documentsAriaLabel"
          css={{ position: 'relative', overflowY: 'auto' }}
        >
          <>
            <FieldValidationCallout validationResults={fieldValidationResult} />
            {loading === true ? <LoadingCategorization onClose={onClose} /> : null}
            <InformationText
              loading={loading}
              categoriesLength={data?.categories?.length ?? null}
              eventRateLength={eventRate.length}
              fieldSelected={selectedField !== null}
            />
            {loading === false &&
            data !== null &&
            data.categories.length > 0 &&
            selectedField !== null ? (
              <CategoryTable
                categories={data.categories}
                aiopsListState={stateFromUrl}
                dataViewId={dataView.id!}
                eventRate={eventRate}
                selectedField={selectedField}
                pinnedCategory={pinnedCategory}
                setPinnedCategory={setPinnedCategory}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                timefilter={timefilter}
                onAddFilter={onAddFilter}
                onClose={onClose}
                enableRowActions={false}
                additionalFilter={
                  selectedTab === SELECTED_TAB.BUCKET && additionalFilter !== undefined
                    ? additionalFilter
                    : undefined
                }
                navigateToDiscover={additionalFilter !== undefined}
                displayExamples={data.displayExamples}
                displayHeader={false}
              />
            ) : null}
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
