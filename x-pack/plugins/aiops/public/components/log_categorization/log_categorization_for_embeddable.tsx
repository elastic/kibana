/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import {
  // EuiTitle,
  // EuiFlyoutHeader,
  // EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import { buildEmptyFilter } from '@kbn/es-query';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
import { stringHash } from '@kbn/ml-string-hash';
import useMount from 'react-use/lib/useMount';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { CategorizationAdditionalFilter } from '../../../common/api/log_categorization/create_category_request';
import { AIOPS_TELEMETRY_ID } from '../../../common/constants';

import type { Category } from '../../../common/api/log_categorization/types';

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
// import { SamplingMenu } from './sampling_menu';
// import { TechnicalPreviewBadge } from './technical_preview_badge';
import { LoadingCategorization } from './loading_categorization';
import { useValidateFieldRequest } from './use_validate_category_field';
import { FieldValidationCallout } from './category_validation_callout';
import type { DocumentStats } from '../../hooks/use_document_count_stats';
import { EmbeddableMenu } from './embeddable_menu';
// import { CreateCategorizationJobButton } from './create_categorization_job';

enum SELECTED_TAB {
  BUCKET,
  FULL_TIME_RANGE,
}

export interface LogCategorizationPageProps {
  dataView: DataView;
  savedSearch: SavedSearch | null;
  onClose: () => void;
  /** Identifier to indicate the plugin utilizing the component */
  embeddingOrigin: string;
  additionalFilter?: CategorizationAdditionalFilter;
  onAddFilter?: () => void;
  getViewModeToggle: (patternCount: number) => React.ReactElement | undefined;
}

const BAR_TARGET = 20;

export const LogCategorizationEmbeddable: FC<LogCategorizationPageProps> = ({
  dataView,
  savedSearch,
  onClose,
  embeddingOrigin,
  additionalFilter,
  onAddFilter,
  getViewModeToggle,
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
  const [selectedField, setSelectedField] = useState<DataViewField | null>(null);
  const [fields, setFields] = useState<DataViewField[]>([]);
  const [selectedSavedSearch /* , setSelectedSavedSearch*/] = useState(savedSearch);
  const [previousDocumentStatsHash, setPreviousDocumentStatsHash] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
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

  const cancelRequest = useCallback(() => {
    cancelValidationRequest();
    cancelCategorizationRequest();
  }, [cancelCategorizationRequest, cancelValidationRequest]);

  useMount(function loadFields() {
    const dataViewFields = dataView.fields.filter((f) => f.esTypes?.includes(ES_FIELD_TYPES.TEXT));
    setFields(dataViewFields);
    const messageField = dataViewFields.find((f) => f.name === 'message');
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
      };
    },
    [cancelRequest, mounted]
  );

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch: selectedSavedSearch },
    stateFromUrl,
    true
  );

  const { documentStats, timefilter, earliest, latest, intervalMs } = useData(
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

  const onAddFilter2 = useCallback(
    (values: Filter, alias?: string) => {
      const filter = buildEmptyFilter(false, dataView.id);
      if (alias) {
        filter.meta.alias = alias;
      }
      filter.query = values.query;
      if (onAddFilter !== undefined) {
        onAddFilter();
      }
      filterManager.addFilters([filter]);
    },
    [dataView.id, filterManager, onAddFilter]
  );

  useEffect(() => {
    const buckets = documentStats.documentCountStats?.buckets;
    if (buckets === undefined || selectedField === null) {
      return;
    }

    const hash = createDocumentStatsHash(documentStats, selectedField.name);
    if (hash !== previousDocumentStatsHash) {
      randomSampler.setDocCount(documentStats.totalCount);
      setEventRate(
        Object.entries(buckets).map(([key, docCount]) => ({
          key: +key,
          docCount,
        }))
      );
      // setData(null);
      // if (fieldValidationResult !== null) {
      loadCategories();
      // }
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
  ]);
  // console.log(viewModeToggle);

  const infoIconCss = { marginTop: euiTheme.size.m, marginLeft: euiTheme.size.xxs };

  return (
    <>
      <EuiFlexGroup
        className="eui-fullHeight"
        direction="column"
        gutterSize="none"
        responsive={false}
        // data-test-subj="dscMainContent"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <>{getViewModeToggle(data?.categories.length ?? 0)}</>
            <EuiFlexItem />
            <EuiFlexItem grow={false}>
              {randomSampler !== undefined ? (
                <EmbeddableMenu
                  randomSampler={randomSampler}
                  reload={() => loadCategories()}
                  fields={fields}
                  setSelectedField={setSelectedField}
                  selectedField={selectedField}
                />
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {/* <EuiFlyoutHeader hasBorder>
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
      </EuiFlyoutHeader> */}
        {/* <EuiFlyoutBody data-test-subj="mlJobSelectorFlyoutBody"> */}
        <EuiFlexItem
          // className="dscTable"
          aria-labelledby="documentsAriaLabel"
          css={{ position: 'relative', overflowY: 'auto' }}
        >
          <>
            {/* {showTabs === false && loading === false ? (
              <CreateCategorizationJobButton
                dataView={dataView}
                field={selectedField}
                query={searchQuery}
                earliest={earliest}
                latest={latest}
              />
            ) : null} */}

            {/* <EuiFlexGroup>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <SamplingMenu randomSampler={randomSampler} reload={() => forceRefresh()} />
          </EuiFlexItem>
        </EuiFlexGroup> */}

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
              <>
                {showTabs ? (
                  <>
                    <EuiTabs>
                      <EuiTab
                        isSelected={selectedTab === SELECTED_TAB.BUCKET}
                        onClick={() => setSelectedTab(SELECTED_TAB.BUCKET)}
                      >
                        <EuiToolTip
                          content={i18n.translate(
                            'xpack.aiops.logCategorization.tabs.bucket.tooltip',
                            {
                              defaultMessage: 'Patterns that occur in the anomalous bucket.',
                            }
                          )}
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
                  onAddFilter={onAddFilter2}
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
              </>
            ) : null}
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

/**
 * Creates a hash from the document stats to determine if the document stats have changed.
 */
function createDocumentStatsHash(documentStats: DocumentStats, selectedFieldName: string) {
  const lastTimeStampMs = documentStats.documentCountStats?.lastDocTimeStampMs;
  const totalCount = documentStats.documentCountStats?.totalCount;
  const times = Object.keys(documentStats.documentCountStats?.buckets ?? {});
  const firstBucketTimeStamp = times.length ? times[0] : undefined;
  const lastBucketTimeStamp = times.length ? times[times.length - 1] : undefined;
  return stringHash(
    `${lastTimeStampMs}${totalCount}${firstBucketTimeStamp}${lastBucketTimeStamp}${selectedFieldName}`
  );
}
