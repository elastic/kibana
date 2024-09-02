/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

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
  EuiToolTip,
  EuiIcon,
  EuiHorizontalRule,
} from '@elastic/eui';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
import { AIOPS_TELEMETRY_ID } from '@kbn/aiops-common/constants';
import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import { useTableState } from '@kbn/ml-in-memory-table/hooks/use_table_state';
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
import { SamplingMenu, useRandomSamplerStorage } from './sampling_menu';
import { LoadingCategorization } from './loading_categorization';
import { useValidateFieldRequest } from './use_validate_category_field';
import { FieldValidationCallout } from './category_validation_callout';
import { CreateCategorizationJobButton } from './create_categorization_job';
import { TableHeader } from './category_table/table_header';
import { useActions } from './category_table/use_actions';

enum SELECTED_TAB {
  BUCKET,
  FULL_TIME_RANGE,
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
      query: { getState },
    },
    uiSettings,
  } = useAiopsAppContext();

  const { runValidateFieldRequest, cancelRequest: cancelValidationRequest } =
    useValidateFieldRequest();
  const { euiTheme } = useEuiTheme();
  const { filters, query } = useMemo(() => getState(), [getState]);

  const mounted = useRef(false);
  const randomSamplerStorage = useRandomSamplerStorage();
  const {
    runCategorizeRequest,
    cancelRequest: cancelCategorizationRequest,
    randomSampler,
  } = useCategorizeRequest(randomSamplerStorage);
  const [stateFromUrl] = usePageUrlState<LogCategorizationPageUrlState>(
    'logCategorization',
    getDefaultLogCategorizationAppState({
      searchQuery: createMergedEsQuery(query, filters, dataView, uiSettings),
    })
  );
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [data, setData] = useState<{
    categories: Category[];
    categoriesInBucket: Category[] | null;
    displayExamples: boolean;
  } | null>(null);
  const [fieldValidationResult, setFieldValidationResult] = useState<FieldValidationResults | null>(
    null
  );
  const [showTabs, setShowTabs] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<SELECTED_TAB>(SELECTED_TAB.FULL_TIME_RANGE);
  const tableState = useTableState<Category>([], 'key');

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
    { dataView, savedSearch },
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

  const { getActions, openInDiscover } = useActions(
    dataView.id!,
    selectedField,
    selectedCategories,
    stateFromUrl,
    timefilter,
    undefined,
    undefined
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

    const runtimeMappings = dataView.getRuntimeMappings();

    try {
      const [validationResult, categorizationResult] = await Promise.all([
        runValidateFieldRequest(
          index,
          selectedField.name,
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
          selectedField.name,
          timeField,
          timeRange,
          searchQuery,
          runtimeMappings,
          intervalMs,
          additionalFilter
        ),
      ]);

      if (mounted.current === true) {
        setFieldValidationResult(validationResult);
        const { categories, hasExamples } = categorizationResult;

        const hasBucketCategories = categories.some((c) => c.subTimeRangeCount !== undefined);
        let categoriesInBucket: any | null = null;
        if (additionalFilter !== undefined) {
          categoriesInBucket = categorizationResult.categories
            .map((category) => ({
              ...category,
              count: category.subFieldCount ?? category.subTimeRangeCount!,
              examples: category.subFieldExamples!,
              sparkline: undefined,
            }))
            .filter((category) => category.count > 0)
            .sort((a, b) => b.count - a.count);
        }

        setData({
          categories,
          categoriesInBucket,
          displayExamples: hasExamples,
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

  const actions = getActions(true);
  const infoIconCss = { marginTop: euiTheme.size.m, marginLeft: euiTheme.size.xxs };

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
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <SamplingMenu randomSampler={randomSampler} reload={() => forceRefresh()} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="mlJobSelectorFlyoutBody">
        {showTabs === false && loading === false ? (
          <CreateCategorizationJobButton
            dataView={dataView}
            field={selectedField}
            query={searchQuery}
            earliest={earliest}
            latest={latest}
          />
        ) : null}
        <FieldValidationCallout validationResults={fieldValidationResult} />
        {loading === true ? <LoadingCategorization onCancel={onClose} /> : null}
        <InformationText
          loading={loading}
          categoriesLength={data?.categories?.length ?? null}
          eventRateLength={eventRate.length}
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
                    <EuiToolTip
                      content={i18n.translate('xpack.aiops.logCategorization.tabs.bucket.tooltip', {
                        defaultMessage: 'Patterns that occur in the anomalous bucket.',
                      })}
                    >
                      <EuiFlexGroup gutterSize="none">
                        <EuiFlexItem>
                          <FormattedMessage
                            id="xpack.aiops.logCategorization.tabs.bucket"
                            defaultMessage="Bucket"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false} css={infoIconCss}>
                          <EuiIcon
                            size="s"
                            color="subdued"
                            type="questionInCircle"
                            className="eui-alignTop"
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiToolTip>
                  </EuiTab>

                  <EuiTab
                    isSelected={selectedTab === SELECTED_TAB.FULL_TIME_RANGE}
                    onClick={() => setSelectedTab(SELECTED_TAB.FULL_TIME_RANGE)}
                  >
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.aiops.logCategorization.tabs.fullTimeRange.tooltip',
                        {
                          defaultMessage:
                            'Patterns that occur in the time range selected for the page.',
                        }
                      )}
                    >
                      <EuiFlexGroup gutterSize="none">
                        <EuiFlexItem>
                          <FormattedMessage
                            id="xpack.aiops.logCategorization.tabs.fullTimeRange"
                            defaultMessage="Full time range"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false} css={infoIconCss}>
                          <EuiIcon
                            size="s"
                            color="subdued"
                            type="questionInCircle"
                            className="eui-alignTop"
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiToolTip>
                  </EuiTab>
                </EuiTabs>
                <EuiSpacer size="s" />
              </>
            ) : null}

            <TableHeader
              categoriesCount={data.categories.length}
              selectedCategoriesCount={selectedCategories.length}
              openInDiscover={openInDiscover}
            />

            <EuiSpacer size="xs" />
            <EuiHorizontalRule margin="none" />

            <CategoryTable
              categories={
                selectedTab === SELECTED_TAB.BUCKET && data.categoriesInBucket !== null
                  ? data.categoriesInBucket
                  : data.categories
              }
              eventRate={eventRate}
              enableRowActions={false}
              displayExamples={data.displayExamples}
              setSelectedCategories={setSelectedCategories}
              tableState={tableState}
              actions={actions}
            />
          </>
        ) : null}
      </EuiFlyoutBody>
    </>
  );
};
