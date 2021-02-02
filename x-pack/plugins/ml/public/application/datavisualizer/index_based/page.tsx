/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useMemo, useState, useCallback } from 'react';
import { merge } from 'rxjs';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  IFieldType,
  KBN_FIELD_TYPES,
  esQuery,
  esKuery,
  UI_SETTINGS,
  Query,
} from '../../../../../../../src/plugins/data/public';
import { SavedSearchSavedObject } from '../../../../common/types/kibana';
import { NavigationMenu } from '../../components/navigation_menu';
import { DatePickerWrapper } from '../../components/navigation_menu/date_picker_wrapper';
import { ML_JOB_FIELD_TYPES } from '../../../../common/constants/field_types';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '../../../../common/constants/search';
import { isFullLicense } from '../../license';
import { checkPermission } from '../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../ml_nodes_check/check_ml_nodes';
import { FullTimeRangeSelector } from '../../components/full_time_range_selector';
import { mlTimefilterRefresh$ } from '../../services/timefilter_refresh_service';
import { useMlContext } from '../../contexts/ml';
import { kbnTypeToMLJobType } from '../../util/field_types_utils';
import { useTimefilter } from '../../contexts/kibana';
import { timeBasedIndexCheck, getQueryFromSavedSearch } from '../../util/index_utils';
import { getTimeBucketsFromCache } from '../../util/time_buckets';
import { getToastNotifications } from '../../util/dependency_cache';
import { usePageUrlState, useUrlState } from '../../util/url_state';
import { ActionsPanel } from './components/actions_panel';
import { SearchPanel } from './components/search_panel';
import { DocumentCountContent } from './components/field_data_row/content_types/document_count_content';
import { DataVisualizerTable, ItemIdToExpandedRowMap } from '../stats_table';
import { FieldCountPanel } from './components/field_count_panel';
import { ML_PAGES } from '../../../../common/constants/ml_url_generator';
import { DataLoader } from './data_loader';
import type { FieldRequestConfig } from './common';
import type { DataVisualizerIndexBasedAppState } from '../../../../common/types/ml_url_generator';
import type { OverallStats } from '../../../../common/types/datavisualizer';
import { MlJobFieldType } from '../../../../common/types/field_types';
import { HelpMenu } from '../../components/help_menu';
import { useMlKibana } from '../../contexts/kibana';
import { IndexBasedDataVisualizerExpandedRow } from './components/expanded_row';
import { FieldVisConfig } from '../stats_table/types';
import type {
  MetricFieldsStats,
  TotalFieldsStats,
} from '../stats_table/components/field_count_stats';

interface DataVisualizerPageState {
  overallStats: OverallStats;
  metricConfigs: FieldVisConfig[];
  totalMetricFieldCount: number;
  populatedMetricFieldCount: number;
  metricsLoaded: boolean;
  nonMetricConfigs: FieldVisConfig[];
  nonMetricsLoaded: boolean;
  documentCountStats?: FieldVisConfig;
}

const defaultSearchQuery = {
  match_all: {},
};

function getDefaultPageState(): DataVisualizerPageState {
  return {
    overallStats: {
      totalCount: 0,
      aggregatableExistsFields: [],
      aggregatableNotExistsFields: [],
      nonAggregatableExistsFields: [],
      nonAggregatableNotExistsFields: [],
    },
    metricConfigs: [],
    totalMetricFieldCount: 0,
    populatedMetricFieldCount: 0,
    metricsLoaded: false,
    nonMetricConfigs: [],
    nonMetricsLoaded: false,
    documentCountStats: undefined,
  };
}
export const getDefaultDataVisualizerListState = (): Required<DataVisualizerIndexBasedAppState> => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'fieldName',
  sortDirection: 'asc',
  visibleFieldTypes: [],
  visibleFieldNames: [],
  samplerShardSize: 5000,
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  showDistributions: true,
  showAllFields: false,
  showEmptyFields: false,
});

export const Page: FC = () => {
  const mlContext = useMlContext();
  const restorableDefaults = getDefaultDataVisualizerListState();
  const [dataVisualizerListState, setDataVisualizerListState] = usePageUrlState(
    ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER,
    restorableDefaults
  );

  const { combinedQuery, currentIndexPattern, currentSavedSearch, kibanaConfig } = mlContext;
  const timefilter = useTimefilter({
    timeRangeSelector: currentIndexPattern.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const dataLoader = useMemo(() => new DataLoader(currentIndexPattern, getToastNotifications()), [
    currentIndexPattern,
  ]);

  const [globalState, setGlobalState] = useUrlState('_g');
  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
  }, [globalState?.time?.from, globalState?.time?.to]);
  useEffect(() => {
    if (globalState?.refreshInterval !== undefined) {
      timefilter.setRefreshInterval(globalState.refreshInterval);
    }
  }, [globalState?.refreshInterval?.pause, globalState?.refreshInterval?.value]);

  const [lastRefresh, setLastRefresh] = useState(0);

  useEffect(() => {
    timeBasedIndexCheck(currentIndexPattern, true);
  }, []);

  // Obtain the list of non metric field types which appear in the index pattern.
  let indexedFieldTypes: MlJobFieldType[] = [];
  const indexPatternFields: IFieldType[] = currentIndexPattern.fields;
  indexPatternFields.forEach((field) => {
    if (field.scripted !== true) {
      const dataVisualizerType: MlJobFieldType | undefined = kbnTypeToMLJobType(field);
      if (dataVisualizerType !== undefined && !indexedFieldTypes.includes(dataVisualizerType)) {
        indexedFieldTypes.push(dataVisualizerType);
      }
    }
  });
  indexedFieldTypes = indexedFieldTypes.sort();

  const defaults = getDefaultPageState();

  const showActionsPanel =
    isFullLicense() &&
    checkPermission('canCreateJob') &&
    mlNodesAvailable() &&
    currentIndexPattern.timeFieldName !== undefined;

  const { searchQueryLanguage, searchString, searchQuery } = useMemo(() => {
    const searchData = extractSearchData(currentSavedSearch);
    if (searchData === undefined || dataVisualizerListState.searchString !== '') {
      return {
        searchQuery: dataVisualizerListState.searchQuery,
        searchString: dataVisualizerListState.searchString,
        searchQueryLanguage: dataVisualizerListState.searchQueryLanguage,
      };
    } else {
      return {
        searchQuery: searchData.searchQuery,
        searchString: searchData.searchString,
        searchQueryLanguage: searchData.queryLanguage,
      };
    }
  }, [currentSavedSearch, dataVisualizerListState]);

  const setSearchParams = (searchParams: {
    searchQuery: Query['query'];
    searchString: Query['query'];
    queryLanguage: SearchQueryLanguage;
  }) => {
    setDataVisualizerListState({
      ...dataVisualizerListState,
      searchQuery: searchParams.searchQuery,
      searchString: searchParams.searchString,
      searchQueryLanguage: searchParams.queryLanguage,
    });
  };

  const samplerShardSize =
    dataVisualizerListState.samplerShardSize ?? restorableDefaults.samplerShardSize;
  const setSamplerShardSize = (value: number) => {
    setDataVisualizerListState({ ...dataVisualizerListState, samplerShardSize: value });
  };

  const visibleFieldTypes =
    dataVisualizerListState.visibleFieldTypes ?? restorableDefaults.visibleFieldTypes;
  const setVisibleFieldTypes = (values: string[]) => {
    setDataVisualizerListState({ ...dataVisualizerListState, visibleFieldTypes: values });
  };

  const visibleFieldNames =
    dataVisualizerListState.visibleFieldNames ?? restorableDefaults.visibleFieldNames;
  const setVisibleFieldNames = (values: string[]) => {
    setDataVisualizerListState({ ...dataVisualizerListState, visibleFieldNames: values });
  };

  const showEmptyFields =
    dataVisualizerListState.showEmptyFields ?? restorableDefaults.showEmptyFields;
  const toggleShowEmptyFields = () => {
    setDataVisualizerListState({
      ...dataVisualizerListState,
      showEmptyFields: !dataVisualizerListState.showEmptyFields,
    });
  };

  const [overallStats, setOverallStats] = useState(defaults.overallStats);

  const [documentCountStats, setDocumentCountStats] = useState(defaults.documentCountStats);
  const [metricConfigs, setMetricConfigs] = useState(defaults.metricConfigs);
  const [metricsLoaded, setMetricsLoaded] = useState(defaults.metricsLoaded);
  const [metricsStats, setMetricsStats] = useState<undefined | MetricFieldsStats>();

  const [nonMetricConfigs, setNonMetricConfigs] = useState(defaults.nonMetricConfigs);
  const [nonMetricsLoaded, setNonMetricsLoaded] = useState(defaults.nonMetricsLoaded);

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getTimeUpdate$(),
      mlTimefilterRefresh$
    ).subscribe(() => {
      setGlobalState({
        time: timefilter.getTime(),
        refreshInterval: timefilter.getRefreshInterval(),
      });
      setLastRefresh(Date.now());
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  useEffect(() => {
    loadOverallStats();
  }, [searchQuery, samplerShardSize, lastRefresh]);

  useEffect(() => {
    createMetricCards();
    createNonMetricCards();
  }, [overallStats, showEmptyFields]);

  useEffect(() => {
    loadMetricFieldStats();
  }, [metricConfigs]);

  useEffect(() => {
    loadNonMetricFieldStats();
  }, [nonMetricConfigs]);

  useEffect(() => {
    createMetricCards();
  }, [metricsLoaded]);

  useEffect(() => {
    createNonMetricCards();
  }, [nonMetricsLoaded]);

  /**
   * Extract query data from the saved search object.
   */
  function extractSearchData(savedSearch: SavedSearchSavedObject | null) {
    if (!savedSearch) {
      return undefined;
    }

    const { query } = getQueryFromSavedSearch(savedSearch);
    const queryLanguage = query.language as SearchQueryLanguage;
    const qryString = query.query;
    let qry;
    if (queryLanguage === SEARCH_QUERY_LANGUAGE.KUERY) {
      const ast = esKuery.fromKueryExpression(qryString);
      qry = esKuery.toElasticsearchQuery(ast, currentIndexPattern);
    } else {
      qry = esQuery.luceneStringToDsl(qryString);
      esQuery.decorateQuery(qry, kibanaConfig.get(UI_SETTINGS.QUERY_STRING_OPTIONS));
    }

    return {
      searchQuery: qry,
      searchString: qryString,
      queryLanguage,
    };
  }

  async function loadOverallStats() {
    const tf = timefilter as any;
    let earliest;
    let latest;

    const activeBounds = tf.getActiveBounds();

    if (currentIndexPattern.timeFieldName !== undefined && activeBounds === undefined) {
      return;
    }

    if (currentIndexPattern.timeFieldName !== undefined) {
      earliest = activeBounds.min.valueOf();
      latest = activeBounds.max.valueOf();
    }

    try {
      const allStats = await dataLoader.loadOverallData(
        searchQuery,
        samplerShardSize,
        earliest,
        latest
      );
      setOverallStats(allStats);
    } catch (err) {
      dataLoader.displayError(err);
    }
  }

  async function loadMetricFieldStats() {
    // Only request data for fields that exist in documents.
    if (metricConfigs.length === 0) {
      return;
    }

    const configsToLoad = metricConfigs.filter(
      (config) => config.existsInDocs === true && config.loading === true
    );
    if (configsToLoad.length === 0) {
      return;
    }

    // Pass the field name, type and cardinality in the request.
    // Top values will be obtained on a sample if cardinality > 100000.
    const existMetricFields: FieldRequestConfig[] = configsToLoad.map((config) => {
      const props = { fieldName: config.fieldName, type: config.type, cardinality: 0 };
      if (config.stats !== undefined && config.stats.cardinality !== undefined) {
        props.cardinality = config.stats.cardinality;
      }
      return props;
    });

    // Obtain the interval to use for date histogram aggregations
    // (such as the document count chart). Aim for 75 bars.
    const buckets = getTimeBucketsFromCache();

    const tf = timefilter as any;
    let earliest: number | undefined;
    let latest: number | undefined;
    if (currentIndexPattern.timeFieldName !== undefined) {
      earliest = tf.getActiveBounds().min.valueOf();
      latest = tf.getActiveBounds().max.valueOf();
    }

    const bounds = tf.getActiveBounds();
    const BAR_TARGET = 75;
    buckets.setInterval('auto');
    buckets.setBounds(bounds);
    buckets.setBarTarget(BAR_TARGET);
    const aggInterval = buckets.getInterval();

    try {
      const metricFieldStats = await dataLoader.loadFieldStats(
        searchQuery,
        samplerShardSize,
        earliest,
        latest,
        existMetricFields,
        aggInterval.asMilliseconds()
      );

      // Add the metric stats to the existing stats in the corresponding config.
      const configs: FieldVisConfig[] = [];
      metricConfigs.forEach((config) => {
        const configWithStats = { ...config };
        if (config.fieldName !== undefined) {
          configWithStats.stats = {
            ...configWithStats.stats,
            ...metricFieldStats.find(
              (fieldStats: any) => fieldStats.fieldName === config.fieldName
            ),
          };
          configWithStats.loading = false;
          configs.push(configWithStats);
        } else {
          // Document count card.
          configWithStats.stats = metricFieldStats.find(
            (fieldStats: any) => fieldStats.fieldName === undefined
          );

          if (configWithStats.stats !== undefined) {
            // Add earliest / latest of timefilter for setting x axis domain.
            configWithStats.stats.timeRangeEarliest = earliest;
            configWithStats.stats.timeRangeLatest = latest;
          }
          setDocumentCountStats(configWithStats);
        }
      });

      setMetricConfigs(configs);
    } catch (err) {
      dataLoader.displayError(err);
    }
  }

  async function loadNonMetricFieldStats() {
    // Only request data for fields that exist in documents.
    if (nonMetricConfigs.length === 0) {
      return;
    }

    const configsToLoad = nonMetricConfigs.filter(
      (config) => config.existsInDocs === true && config.loading === true
    );
    if (configsToLoad.length === 0) {
      return;
    }

    // Pass the field name, type and cardinality in the request.
    // Top values will be obtained on a sample if cardinality > 100000.
    const existNonMetricFields: FieldRequestConfig[] = configsToLoad.map((config) => {
      const props = { fieldName: config.fieldName, type: config.type, cardinality: 0 };
      if (config.stats !== undefined && config.stats.cardinality !== undefined) {
        props.cardinality = config.stats.cardinality;
      }
      return props;
    });

    const tf = timefilter as any;
    let earliest;
    let latest;
    if (currentIndexPattern.timeFieldName !== undefined) {
      earliest = tf.getActiveBounds().min.valueOf();
      latest = tf.getActiveBounds().max.valueOf();
    }

    try {
      const nonMetricFieldStats = await dataLoader.loadFieldStats(
        searchQuery,
        samplerShardSize,
        earliest,
        latest,
        existNonMetricFields
      );

      // Add the field stats to the existing stats in the corresponding config.
      const configs: FieldVisConfig[] = [];
      nonMetricConfigs.forEach((config) => {
        const configWithStats = { ...config };
        if (config.fieldName !== undefined) {
          configWithStats.stats = {
            ...configWithStats.stats,
            ...nonMetricFieldStats.find(
              (fieldStats: any) => fieldStats.fieldName === config.fieldName
            ),
          };
        }
        configWithStats.loading = false;
        configs.push(configWithStats);
      });

      setNonMetricConfigs(configs);
    } catch (err) {
      dataLoader.displayError(err);
    }
  }

  function createMetricCards() {
    const configs: FieldVisConfig[] = [];
    const aggregatableExistsFields: any[] = overallStats.aggregatableExistsFields || [];

    const allMetricFields = indexPatternFields.filter((f) => {
      return (
        f.type === KBN_FIELD_TYPES.NUMBER &&
        f.displayName !== undefined &&
        dataLoader.isDisplayField(f.displayName) === true
      );
    });
    const metricExistsFields = allMetricFields.filter((f) => {
      return aggregatableExistsFields.find((existsF) => {
        return existsF.fieldName === f.displayName;
      });
    });

    // Add a config for 'document count', identified by no field name if indexpattern is time based.
    if (currentIndexPattern.timeFieldName !== undefined) {
      configs.push({
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        loading: true,
        aggregatable: true,
      });
    }

    if (metricsLoaded === false) {
      setMetricsLoaded(true);
      return;
    }

    let aggregatableFields: any[] = overallStats.aggregatableExistsFields;
    if (allMetricFields.length !== metricExistsFields.length && metricsLoaded === true) {
      aggregatableFields = aggregatableFields.concat(overallStats.aggregatableNotExistsFields);
    }

    const metricFieldsToShow =
      metricsLoaded === true && showEmptyFields === true ? allMetricFields : metricExistsFields;

    metricFieldsToShow.forEach((field) => {
      const fieldData = aggregatableFields.find((f) => {
        return f.fieldName === field.displayName;
      });

      const metricConfig: FieldVisConfig = {
        ...(fieldData ? fieldData : {}),
        fieldFormat: currentIndexPattern.getFormatterForField(field),
        type: ML_JOB_FIELD_TYPES.NUMBER,
        loading: true,
        aggregatable: true,
      };

      configs.push(metricConfig);
    });

    setMetricsStats({
      totalMetricFieldsCount: allMetricFields.length,
      visibleMetricsCount: metricFieldsToShow.length,
    });
    setMetricConfigs(configs);
  }

  function createNonMetricCards() {
    const allNonMetricFields = indexPatternFields.filter((f) => {
      return (
        f.type !== KBN_FIELD_TYPES.NUMBER &&
        f.displayName !== undefined &&
        dataLoader.isDisplayField(f.displayName) === true
      );
    });
    // Obtain the list of all non-metric fields which appear in documents
    // (aggregatable or not aggregatable).
    const populatedNonMetricFields: any[] = []; // Kibana index pattern non metric fields.
    let nonMetricFieldData: any[] = []; // Basic non metric field data loaded from requesting overall stats.
    const aggregatableExistsFields: any[] = overallStats.aggregatableExistsFields || [];
    const nonAggregatableExistsFields: any[] = overallStats.nonAggregatableExistsFields || [];

    allNonMetricFields.forEach((f) => {
      const checkAggregatableField = aggregatableExistsFields.find(
        (existsField) => existsField.fieldName === f.displayName
      );

      if (checkAggregatableField !== undefined) {
        populatedNonMetricFields.push(f);
        nonMetricFieldData.push(checkAggregatableField);
      } else {
        const checkNonAggregatableField = nonAggregatableExistsFields.find(
          (existsField) => existsField.fieldName === f.displayName
        );

        if (checkNonAggregatableField !== undefined) {
          populatedNonMetricFields.push(f);
          nonMetricFieldData.push(checkNonAggregatableField);
        }
      }
    });

    if (nonMetricsLoaded === false) {
      setNonMetricsLoaded(true);
      return;
    }

    if (allNonMetricFields.length !== nonMetricFieldData.length && showEmptyFields === true) {
      // Combine the field data obtained from Elasticsearch into a single array.
      nonMetricFieldData = nonMetricFieldData.concat(
        overallStats.aggregatableNotExistsFields,
        overallStats.nonAggregatableNotExistsFields
      );
    }

    const nonMetricFieldsToShow = showEmptyFields ? allNonMetricFields : populatedNonMetricFields;

    const configs: FieldVisConfig[] = [];

    nonMetricFieldsToShow.forEach((field) => {
      const fieldData = nonMetricFieldData.find((f) => f.fieldName === field.displayName);

      const nonMetricConfig = {
        ...fieldData,
        fieldFormat: currentIndexPattern.getFormatterForField(field),
        aggregatable: field.aggregatable,
        scripted: field.scripted,
        loading: fieldData.existsInDocs,
      };

      // Map the field type from the Kibana index pattern to the field type
      // used in the data visualizer.
      const dataVisualizerType = kbnTypeToMLJobType(field);
      if (dataVisualizerType !== undefined) {
        nonMetricConfig.type = dataVisualizerType;
      } else {
        // Add a flag to indicate that this is one of the 'other' Kibana
        // field types that do not yet have a specific card type.
        nonMetricConfig.type = field.type;
        nonMetricConfig.isUnsupportedType = true;
      }

      configs.push(nonMetricConfig);
    });

    setNonMetricConfigs(configs);
  }

  const wizardPanelWidth = '280px';

  const configs = useMemo(() => {
    let combinedConfigs = [...nonMetricConfigs, ...metricConfigs];
    if (visibleFieldTypes && visibleFieldTypes.length > 0) {
      combinedConfigs = combinedConfigs.filter(
        (config) => visibleFieldTypes.findIndex((field) => field === config.type) > -1
      );
    }
    if (visibleFieldNames && visibleFieldNames.length > 0) {
      combinedConfigs = combinedConfigs.filter(
        (config) => visibleFieldNames.findIndex((field) => field === config.fieldName) > -1
      );
    }

    return combinedConfigs;
  }, [nonMetricConfigs, metricConfigs, visibleFieldTypes, visibleFieldNames]);

  const fieldsCountStats: TotalFieldsStats | undefined = useMemo(() => {
    let _visibleFieldsCount = 0;
    let _totalFieldsCount = 0;
    Object.keys(overallStats).forEach((key) => {
      const fieldsGroup = overallStats[key as keyof OverallStats];
      if (Array.isArray(fieldsGroup) && fieldsGroup.length > 0) {
        _totalFieldsCount += fieldsGroup.length;
      }
    });

    if (showEmptyFields === true) {
      _visibleFieldsCount = _totalFieldsCount;
    } else {
      _visibleFieldsCount =
        overallStats.aggregatableExistsFields.length +
        overallStats.nonAggregatableExistsFields.length;
    }
    return { visibleFieldsCount: _visibleFieldsCount, totalFieldsCount: _totalFieldsCount };
  }, [overallStats, showEmptyFields]);

  const getItemIdToExpandedRowMap = useCallback(
    function (itemIds: string[], items: FieldVisConfig[]): ItemIdToExpandedRowMap {
      return itemIds.reduce((m: ItemIdToExpandedRowMap, fieldName: string) => {
        const item = items.find((fieldVisConfig) => fieldVisConfig.fieldName === fieldName);
        if (item !== undefined) {
          m[fieldName] = (
            <IndexBasedDataVisualizerExpandedRow
              item={item}
              indexPattern={currentIndexPattern}
              combinedQuery={{ searchQueryLanguage, searchString }}
            />
          );
        }
        return m;
      }, {} as ItemIdToExpandedRowMap);
    },
    [currentIndexPattern, searchQuery]
  );

  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;
  return (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      <EuiPage data-test-subj="mlPageIndexDataVisualizer">
        <EuiPageBody>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiPageContentHeader>
                <EuiPageContentHeaderSection>
                  <EuiTitle size="l">
                    <h1>{currentIndexPattern.title}</h1>
                  </EuiTitle>
                </EuiPageContentHeaderSection>
                <EuiPageContentHeaderSection data-test-subj="mlDataVisualizerTimeRangeSelectorSection">
                  <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="s">
                    {currentIndexPattern.timeFieldName !== undefined && (
                      <EuiFlexItem grow={false}>
                        <FullTimeRangeSelector
                          indexPattern={currentIndexPattern}
                          query={combinedQuery}
                          disabled={false}
                        />
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <DatePickerWrapper />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPageContentHeaderSection>
              </EuiPageContentHeader>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiPageContentBody>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <EuiPanel>
                  {documentCountStats && overallStats?.totalCount !== undefined && (
                    <EuiFlexItem grow={true}>
                      <DocumentCountContent
                        config={documentCountStats}
                        totalCount={overallStats.totalCount}
                      />
                    </EuiFlexItem>
                  )}
                  <EuiSpacer size={'m'} />

                  <SearchPanel
                    indexPattern={currentIndexPattern}
                    searchString={searchString}
                    searchQuery={searchQuery}
                    searchQueryLanguage={searchQueryLanguage}
                    setSearchParams={setSearchParams}
                    samplerShardSize={samplerShardSize}
                    setSamplerShardSize={setSamplerShardSize}
                    overallStats={overallStats}
                    indexedFieldTypes={indexedFieldTypes}
                    setVisibleFieldTypes={setVisibleFieldTypes}
                    visibleFieldTypes={visibleFieldTypes}
                    visibleFieldNames={visibleFieldNames}
                    setVisibleFieldNames={setVisibleFieldNames}
                    showEmptyFields={showEmptyFields}
                  />
                  <EuiSpacer size={'l'} />
                  <FieldCountPanel
                    showEmptyFields={showEmptyFields}
                    toggleShowEmptyFields={toggleShowEmptyFields}
                    fieldsCountStats={fieldsCountStats}
                    metricsStats={metricsStats}
                  />
                  <EuiSpacer size={'m'} />
                  <DataVisualizerTable<FieldVisConfig>
                    items={configs}
                    pageState={dataVisualizerListState}
                    updatePageState={setDataVisualizerListState}
                    getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
                  />
                </EuiPanel>
              </EuiFlexItem>
              {showActionsPanel === true && (
                <EuiFlexItem grow={false} style={{ width: wizardPanelWidth }}>
                  <ActionsPanel indexPattern={currentIndexPattern} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};
