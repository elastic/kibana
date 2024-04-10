/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type FC, useState, useEffect, useCallback, useRef, useMemo } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPopoverTitle,
  EuiText,
  EuiLoadingChart,
  EuiButtonEmpty,
  EuiPopoverFooter,
} from '@elastic/eui';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildEmptyFilter, type Filter } from '@kbn/es-query';
import { usePageUrlState } from '@kbn/ml-url-state';
import { type Category } from '@kbn/aiops-log-pattern-analysis/types';
import { type QueryMode, QUERY_MODE } from '@kbn/aiops-log-pattern-analysis/get_category_query';

import { createMergedEsQuery } from '../../application/utils/search_utils';
import { useData } from '../../hooks/use_data';
import { useSearch } from '../../hooks/use_search';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { useCategorizeRequest } from './use_categorize_request';
import type { EventRate } from './use_categorize_request';
import { useValidateFieldRequest } from './use_validate_category_field';
import { MiniHistogram } from '../mini_histogram';
import { createFilter } from './use_discover_links';
import {
  getDefaultLogCategorizationAppState,
  type LogCategorizationPageUrlState,
} from '../../application/url_state/log_pattern_analysis';

type SparkLinesPerCategory = Record<string, Record<number, number>>;

export interface LogCategorizationPageProps {
  dataView: DataView;
  savedSearch: SavedSearch | null;
  selectedField: DataViewField;
  fieldValue: string | undefined;
  onClose: () => void;
  /** Identifier to indicate the plugin utilizing the component */
  embeddingOrigin: string;
}

const BAR_TARGET = 20;

export const LogCategorizationPopover: FC<LogCategorizationPageProps> = ({
  dataView,
  savedSearch,
  selectedField,
  fieldValue,
  onClose,
  embeddingOrigin,
}) => {
  // console.log(fieldValue);

  const {
    notifications: { toasts },
    data: {
      query: { getState, filterManager },
    },
    uiSettings,
  } = useAiopsAppContext();

  const { cancelRequest: cancelValidationRequest } = useValidateFieldRequest();
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
  // const [totalCount, setTotalCount] = useState(0);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  // const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  const [data, setData] = useState<{
    categories: Category[];
    sparkLines: SparkLinesPerCategory;
  } | null>(null);
  // const [fieldValidationResult, setFieldValidationResult] = useState<FieldValidationResults | null>(
  //   null
  // );
  // const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  // const [filterKey, setFilterKey] = useState<string | null>(null);

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

  const openInDiscover = (mode: QueryMode, category?: Category) => {
    if (selectedCategory === null) return;

    if (
      onAddFilter !== undefined &&
      selectedField !== undefined &&
      typeof selectedField !== 'string'
    ) {
      onAddFilter(
        createFilter('', selectedField.name, [selectedCategory], mode, category),
        `Patterns - ${selectedField.name}`
      );
      onClose();
    }
  };

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch: selectedSavedSearch },
    stateFromUrl,
    true
  );

  const { documentStats, earliest, latest, intervalMs } = useData(
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

    if (selectedField === undefined || timeField === undefined) {
      return;
    }

    cancelRequest();

    setLoading(true);
    setData(null);
    // setFieldValidationResult(null);

    try {
      const categorizationResult = await runCategorizeRequest(
        index,
        selectedField.name,
        timeField,
        { from: earliest!, to: latest! },
        searchQuery,
        intervalMs
      );
      if (mounted.current === true) {
        // setFieldValidationResult(validationResult);
        setData({
          categories: categorizationResult.categories,
          sparkLines: categorizationResult.categories.reduce((acc, category) => {
            acc[category.key] = category.sparkline!;
            return acc;
          }, {} as SparkLinesPerCategory),
        });
        if (fieldValue) {
          const category = categorizationResult.categories.find((c) =>
            new RegExp(c.regex).test(fieldValue)
          );
          setSelectedCategory(category ?? null);
          setLoading(false);
        }
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
    cancelRequest,
    earliest,
    latest,
    searchQuery,
    runCategorizeRequest,
    intervalMs,
    fieldValue,
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
      randomSampler.setMode('on_automatic');
      setEventRate(
        Object.entries(documentStats.documentCountStats.buckets).map(([key, docCount]) => ({
          key: +key,
          docCount,
        }))
      );
      setData(null);
      loadCategories();
      // setTotalCount(documentStats.totalCount);
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

  // useEffect(
  //   function filterCategories() {
  //     if (!data) {
  //       return;
  //     }
  //     setFilteredCategories(
  //       filterKey === null ? data.categories : data.categories.filter((c) => c.key === filterKey)
  //     );
  //   },
  //   [data, filterKey]
  // );

  const histogram = eventRate.map(({ key: catKey, docCount }) => {
    const term =
      (selectedCategory?.key && data ? data.sparkLines[selectedCategory?.key][catKey] : 0) ?? 0;
    const newTerm = term > docCount ? docCount : term;
    const adjustedDocCount = docCount - newTerm;
    // console.log(selectedCategory);

    return {
      doc_count_overall: adjustedDocCount,
      doc_count_significant_item: newTerm,
      key: catKey,
      key_as_string: `${catKey}`,
    };
  });

  return (
    <>
      <EuiPopoverTitle>
        <FormattedMessage
          id="xpack.aiops.categorizeFlyout.title"
          defaultMessage="Pattern analysis of {name}"
          values={{ name: selectedField.name }}
        />
      </EuiPopoverTitle>

      <div css={{ width: '300px' }}>
        {eventRate.length && selectedCategory !== null && loading === false ? (
          <>
            {/* <EuiSpacer /> */}
            {/* <EuiText size="xs">
              <FormattedMessage
                id="xpack.aiops.categorizeFlyout.title"
                defaultMessage="Distribution of docs"
              />
            </EuiText> */}
            <MiniHistogram
              chartData={histogram}
              isLoading={false}
              label={''}
              width={'100%'}
              height={'50px'}
            />
            <EuiSpacer />
            <EuiText size="s">
              <FormattedMessage
                id="xpack.aiops.categorizeFlyout.title"
                defaultMessage="{count} docs match this pattern"
                values={{ count: selectedCategory.count }}
              />
            </EuiText>

            <EuiPopoverFooter paddingSize="s">
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiButtonEmpty
                    // flush="left"
                    data-test-subj="aiopsLogCategorizationPopoverFilterForPatternButton"
                    iconSide="left"
                    size="s"
                    onClick={() => openInDiscover(QUERY_MODE.INCLUDE, selectedCategory)}
                    iconType="plusInCircle"
                  >
                    Filter for pattern
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty
                    // flush="right"
                    data-test-subj="aiopsLogCategorizationPopoverFilterForPatternButton"
                    iconSide="left"
                    size="s"
                    onClick={() => openInDiscover(QUERY_MODE.EXCLUDE, selectedCategory)}
                    iconType="minusInCircle"
                  >
                    Filter out pattern
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverFooter>
          </>
        ) : (
          <>
            <EuiSpacer />
            <EuiFlexGroup justifyContent="spaceAround">
              <EuiFlexItem grow={false}>
                <EuiLoadingChart size="xl" mono />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
          </>
        )}
      </div>
    </>
  );
};
