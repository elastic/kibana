/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useState, useEffect, useCallback } from 'react';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTitle, EuiLoadingContent, EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';

// import { AddFieldFilterHandler } from '@kbn/unified-field-list-plugin/public';
// import { FullTimeRangeSelector } from '../full_time_range_selector';
// import { DatePickerWrapper } from '../date_picker_wrapper';
import { useUrlState } from '@kbn/ml-url-state';
import { useData } from '../../hooks/use_data';
// import { SearchPanel } from '../search_panel';
import type { SearchQueryLanguage } from '../../application/utils/search_utils';
// import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { restorableDefaults } from '../explain_log_rate_spikes/explain_log_rate_spikes_app_state';
import { useCategorizeRequest } from './use_categorize_request';
import type { EventRate, Category, SparkLinesPerCategory } from './use_categorize_request';
import { CategoryTable } from './category_table';
// import { DocumentCountChart } from './document_count_chart';
// import { InformationText } from './information_text';

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
  // const {
  //   notifications: { toasts },
  // } = useAiopsAppContext();

  const { runCategorizeRequest, cancelRequest } = useCategorizeRequest();
  const [aiopsListState, setAiopsListState] = useState(restorableDefaults);
  const [globalState, setGlobalState] = useUrlState('_g');
  // const [selectedField, setSelectedField] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  // const [categories, setCategories] = useState<Category[] | null>(null);
  const [selectedSavedSearch, setSelectedSavedSearch] = useState(savedSearch);
  const [loading, setLoading] = useState(true);
  // const [totalCount, setTotalCount] = useState(0);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [pinnedCategory, setPinnedCategory] = useState<Category | null>(null);
  // const [sparkLines, setSparkLines] = useState<SparkLinesPerCategory>({});
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

  const setSearchParams = useCallback(
    (searchParams: {
      searchQuery: Query['query'];
      searchString: Query['query'];
      queryLanguage: SearchQueryLanguage;
      filters: Filter[];
    }) => {
      // When the user loads saved search and then clear or modify the query
      // we should remove the saved search and replace it with the index pattern id
      if (selectedSavedSearch !== null) {
        setSelectedSavedSearch(null);
      }

      setAiopsListState({
        ...aiopsListState,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [selectedSavedSearch, aiopsListState, setAiopsListState]
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

  // const fields = useMemo(
  //   () =>
  //     dataView.fields
  //       .filter(
  //         ({ displayName, esTypes, count }) =>
  //           esTypes && esTypes.includes('text') && !['_id', '_index'].includes(displayName)
  //       )
  //       .map(({ displayName }) => ({
  //         label: displayName,
  //       })),
  //   [dataView]
  // );

  // useEffect(
  //   function setSingleFieldAsSelected() {
  //     if (fields.length === 1) {
  //       setSelectedField(fields[0].label);
  //     }
  //   },
  //   [fields]
  // );

  useEffect(() => {
    if (documentStats.documentCountStats?.buckets) {
      setEventRate(
        Object.entries(documentStats.documentCountStats.buckets).map(([key, docCount]) => ({
          key: +key,
          docCount,
        }))
      );
      // setCategories(null);
      setData(null);
      // setTotalCount(documentStats.totalCount);
    }
  }, [documentStats, earliest, latest, searchQueryLanguage, searchString, searchQuery]);

  const loadCategories = useCallback(async () => {
    const { title: index, timeFieldName: timeField } = dataView;

    if (selectedField === undefined || timeField === undefined) {
      return;
    }

    cancelRequest();

    setLoading(true);
    // setCategories(null);
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
      // setCategories(resp.categories);
      // setSparkLines(resp.sparkLinesPerCategory);
    } catch (error) {
      // toasts.addError(error, {
      //   title: i18n.translate('xpack.aiops.logCategorization.errorLoadingCategories', {
      //     defaultMessage: 'Error loading categories',
      //   }),
      // });
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
    // setLoading,
    // toasts,
  ]);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const onFieldChange = (value: EuiComboBoxOptionOption[] | undefined) => {
  //   setCategories(null);
  //   setSelectedField(value && value.length ? value[0].label : undefined);
  // };

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
        {/* <EuiPageBody data-test-subj="aiopsExplainLogRateSpikesPage" paddingSize="none" panelled={false}> */}
        {/* <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiPageContentHeader className="aiopsPageHeader">
            <EuiPageContentHeaderSection>
              <div className="dataViewTitleHeader">
                <EuiTitle size="s">
                  <h2>{dataView.getName()}</h2>
                </EuiTitle>
              </div>
            </EuiPageContentHeaderSection>

            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              data-test-subj="aiopsTimeRangeSelectorSection"
            >
              {dataView.timeFieldName !== undefined && (
                <EuiFlexItem grow={false}>
                  <FullTimeRangeSelector
                    dataView={dataView}
                    query={undefined}
                    disabled={false}
                    timefilter={timefilter}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <DatePickerWrapper />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentHeader>
        </EuiFlexItem>
      </EuiFlexGroup>
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
      <EuiSpacer size="m" /> */}
        {/* <EuiFlexGroup gutterSize="none">
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
            >
              <FormattedMessage
                id="xpack.aiops.logCategorization.runButton"
                defaultMessage="Run categorization"
              />
            </EuiButton>
          ) : (
            <EuiButton onClick={() => cancelRequest()}>Cancel</EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ marginTop: 'auto' }} />
        <EuiFlexItem />
      </EuiFlexGroup> */}

        {/* {eventRate.length ? (
        <>
          <EuiSpacer />
          <DocumentCountChart
            eventRate={eventRate}
            pinnedCategory={pinnedCategory}
            selectedCategory={selectedCategory}
            sparkLines={sparkLines}
            totalCount={totalCount}
            documentCountStats={documentStats.documentCountStats}
          />
          <EuiSpacer />
        </>
      ) : null} */}
        {loading === true ? <EuiLoadingContent lines={10} /> : null}

        {/* <InformationText
          loading={loading}
          categoriesLength={categories?.length ?? null}
          eventRateLength={eventRate.length}
          fieldSelected={selectedField !== null}
        /> */}

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
