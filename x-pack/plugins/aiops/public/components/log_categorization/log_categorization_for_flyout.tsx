/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useState, useEffect, useCallback } from 'react';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiFlyoutHeader, EuiFlyoutBody, EuiSkeletonText } from '@elastic/eui';

import { useUrlState } from '@kbn/ml-url-state';
import { useData } from '../../hooks/use_data';
import { restorableDefaults } from '../explain_log_rate_spikes/explain_log_rate_spikes_app_state';
import { useCategorizeRequest } from './use_categorize_request';
import type { EventRate, Category, SparkLinesPerCategory } from './use_categorize_request';
import { CategoryTable } from './category_table';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

export interface LogCategorizationPageProps {
  dataView: DataView;
  savedSearch: SavedSearch | null;
  selectedField: DataViewField;
  onAddFilter?: (
    field: DataViewField | string,
    value: unknown,
    type: '+' | '-',
    title?: string
  ) => void;
  onClose: () => void;
}

const BAR_TARGET = 20;

export const LogCategorizationFlyout: FC<LogCategorizationPageProps> = ({
  dataView,
  savedSearch,
  selectedField,
  onAddFilter,
  onClose,
}) => {
  const {
    notifications: { toasts },
  } = useAiopsAppContext();
  const { runCategorizeRequest, cancelRequest } = useCategorizeRequest();
  const [aiopsListState /* , setAiopsListState*/] = useState(restorableDefaults);
  const [globalState, setGlobalState] = useUrlState('_g');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSavedSearch /* , setSelectedSavedSearch*/] = useState(savedSearch);
  const [loading, setLoading] = useState(true);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  const [data, setData] = useState<{
    categories: Category[];
    sparkLines: SparkLinesPerCategory;
  } | null>(null);

  useEffect(
    function cancelRequestOnLeave() {
      return () => {
        cancelRequest();
      };
    },
    [cancelRequest]
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
    { selectedDataView: dataView, selectedSavedSearch },
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

  const loadCategories = useCallback(async () => {
    const { title: index, timeFieldName: timeField } = dataView;

    if (selectedField === undefined || timeField === undefined) {
      return;
    }

    cancelRequest();

    setLoading(true);
    setData(null);

    try {
      const resp = await runCategorizeRequest(
        index,
        selectedField.name,
        timeField,
        earliest,
        latest,
        searchQuery,
        intervalMs
      );

      setData({ categories: resp.categories, sparkLines: resp.sparkLinesPerCategory });
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

  useEffect(() => {
    if (documentStats.documentCountStats?.buckets) {
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
  ]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">
            {i18n.translate('xpack.ml.jobSelector.flyoutTitle', {
              defaultMessage: 'Categorize {name}',
              values: { name: selectedField.name },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj={'mlJobSelectorFlyoutBody'}>
        {loading === true ? <EuiSkeletonText lines={10} /> : null}

        {loading === false && data !== null && data.categories.length > 0 ? (
          <CategoryTable
            categories={data.categories}
            aiopsListState={aiopsListState}
            dataViewId={dataView.id!}
            eventRate={eventRate}
            sparkLines={data.sparkLines}
            selectedField={selectedField}
            pinnedCategory={pinnedCategory}
            setPinnedCategory={setPinnedCategory}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            timefilter={timefilter}
            onAddFilter={onAddFilter}
            onClose={onClose}
            enableRowActions={false}
          />
        ) : null}
      </EuiFlyoutBody>
    </>
  );
};
