/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useState, useEffect, useCallback, useRef, useMemo } from 'react';

import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiTabs,
  EuiTab,
  EuiSpacer,
} from '@elastic/eui';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildEmptyFilter, Filter } from '@kbn/es-query';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
import { AIOPS_TELEMETRY_ID } from '../../../common/constants';

import type { Category } from '../../../common/api/log_categorization/types';

import {
  type LogCategorizationPageUrlState,
  getDefaultLogCategorizationAppState,
} from '../../application/utils/url_state';
import { createMergedEsQuery } from '../../application/utils/search_utils';
import { useData } from '../../hooks/use_data';
import { useSearch } from '../../hooks/use_search';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { useCategorizeRequest } from './use_categorize_request';
import type { EventRate } from './use_categorize_request';
import { CategoryTable } from './category_table';
import { InformationText } from './information_text';
import { SamplingMenu } from './sampling_menu';
import { TechnicalPreviewBadge } from './technical_preview_badge';
import { LoadingCategorization } from './loading_categorization';
import { useValidateFieldRequest } from './use_validate_category_field';
import { FieldValidationCallout } from './category_validation_callout';

enum SELECTED_TAB {
  BUCKET,
  FULL_TIME_RANGE,
}

export interface CategorizationAdditionalFilter {
  from: number;
  to: number;
  field?: { name: string; value: string };
}

export interface LogCategorizationPageProps {
  dataView: DataView;
  savedSearch: SavedSearch | null;
  selectedField: DataViewField;
  onClose: () => void;
  /** Identifier to indicate the plugin utilizing the component */
  embeddingOrigin: string;
  additionalFilter?: CategorizationAdditionalFilter;
}

const BAR_TARGET = 20;

export const LogCategorizationFlyout: FC<LogCategorizationPageProps> = ({
  dataView,
  savedSearch,
  selectedField,
  onClose,
  embeddingOrigin,
  additionalFilter,
}) => {
  const {
    notifications: { toasts },
    data: {
      query: { getState, filterManager },
    },
    uiSettings,
  } = useAiopsAppContext();

  const { runValidateFieldRequest, cancelRequest: cancelValidationRequest } =
    useValidateFieldRequest();
  const { euiTheme } = useEuiTheme();
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
  const [selectedSavedSearch /* , setSelectedSavedSearch*/] = useState(savedSearch);
  const [loading, setLoading] = useState(true);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  const [data, setData] = useState<{
    categories: Category[];
    categoriesInBucket: Category[] | null;
  } | null>(null);
  const [fieldValidationResult, setFieldValidationResult] = useState<FieldValidationResults | null>(
    null
  );
  const [showTabs, setShowTabs] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<SELECTED_TAB>(SELECTED_TAB.FULL_TIME_RANGE);

  const cancelRequest = useCallback(() => {
    cancelValidationRequest();
    cancelCategorizationRequest();
  }, [cancelCategorizationRequest, cancelValidationRequest]);

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

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch: selectedSavedSearch },
    stateFromUrl,
    true
  );

  const { documentStats, timefilter, earliest, latest, intervalMs, forceRefresh } = useData(
    dataView,
    'log_categorization',
    searchQuery,
    undefined,
    undefined,
    undefined,
    BAR_TARGET
  );

  const loadCategories = useCallback(async () => {
    const { getIndexPattern, timeFieldName: timeField } = dataView;
    const index = getIndexPattern();

    if (
      selectedField === undefined ||
      timeField === undefined ||
      earliest === undefined ||
      latest === undefined
    ) {
      return;
    }

    cancelRequest();

    setLoading(true);
    setData(null);
    setFieldValidationResult(null);

    const timeRange = {
      from: earliest,
      to: latest,
    };

    try {
      const [validationResult, categorizationResult] = await Promise.all([
        runValidateFieldRequest(index, selectedField.name, timeField, timeRange, searchQuery, {
          [AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN]: embeddingOrigin,
        }),
        runCategorizeRequest(
          index,
          selectedField.name,
          timeField,
          timeRange,
          searchQuery,
          intervalMs,
          additionalFilter
        ),
      ]);

      if (mounted.current === true) {
        setFieldValidationResult(validationResult);
        const { categories } = categorizationResult;

        const hasBucketCategories = categories.some((c) => c.subTimeRangeCount !== undefined);
        const categoriesInBucket = hasBucketCategories
          ? categorizationResult.categories
              .filter(
                (category) => category.subFieldCount !== undefined && category.subFieldCount > 0
              )
              .map((category) => ({
                ...category,
                count: category.subFieldCount!,
                examples: category.subFieldExamples!,
                sparkline: undefined,
              }))
          : null;

        setData({
          categories,
          categoriesInBucket,
        });

        setShowTabs(hasBucketCategories);
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
    runValidateFieldRequest,
    searchQuery,
    embeddingOrigin,
    runCategorizeRequest,
    intervalMs,
    additionalFilter,
    toasts,
  ]);

  const onAddFilter = useCallback(
    (values: Filter, alias?: string) => {
      const filter = buildEmptyFilter(false, dataView.id);
      if (alias) {
        filter.meta.alias = alias;
      }
      filter.query = values.query;
      filterManager.addFilters([filter]);
    },
    [dataView, filterManager]
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
      loadCategories();
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
  ]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="flyoutTitle" data-test-subj="mlJobSelectorFlyoutTitle">
                <FormattedMessage
                  id="xpack.aiops.categorizeFlyout.title"
                  defaultMessage="Pattern analysis of {name}"
                  values={{ name: selectedField.name }}
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={{ marginTop: euiTheme.size.xs }}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <SamplingMenu randomSampler={randomSampler} reload={() => forceRefresh()} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="mlJobSelectorFlyoutBody">
        <FieldValidationCallout validationResults={fieldValidationResult} />

        {loading === true ? <LoadingCategorization onClose={onClose} /> : null}

        <InformationText
          loading={loading}
          categoriesLength={data?.categories?.length ?? null}
          eventRateLength={eventRate.length}
          fieldSelected={selectedField !== null}
        />

        {loading === false && data !== null && data.categories.length > 0 ? (
          <>
            {showTabs ? (
              <>
                <EuiTabs>
                  <EuiTab
                    isSelected={selectedTab === SELECTED_TAB.BUCKET}
                    onClick={() => setSelectedTab(SELECTED_TAB.BUCKET)}
                  >
                    <FormattedMessage
                      id="xpack.aiops.logCategorization.tabs.bucket"
                      defaultMessage="Bucket"
                    />
                  </EuiTab>

                  <EuiTab
                    isSelected={selectedTab === SELECTED_TAB.FULL_TIME_RANGE}
                    onClick={() => setSelectedTab(SELECTED_TAB.FULL_TIME_RANGE)}
                  >
                    <FormattedMessage
                      id="xpack.aiops.logCategorization.tabs.fullTimeRange"
                      defaultMessage="Full time range"
                    />
                  </EuiTab>
                </EuiTabs>
                <EuiSpacer size="s" />
              </>
            ) : null}
            <CategoryTable
              categories={
                selectedTab === SELECTED_TAB.BUCKET && data.categoriesInBucket !== null
                  ? data.categoriesInBucket
                  : data.categories
              }
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
              discoverTimeRangeOverride={
                selectedTab === SELECTED_TAB.BUCKET && additionalFilter !== undefined
                  ? {
                      from: additionalFilter.from,
                      to: additionalFilter.to,
                    }
                  : undefined
              }
              navigateToDiscover={additionalFilter !== undefined}
            />
          </>
        ) : null}
      </EuiFlyoutBody>
    </>
  );
};
