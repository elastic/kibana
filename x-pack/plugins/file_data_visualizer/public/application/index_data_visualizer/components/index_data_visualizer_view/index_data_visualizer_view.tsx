/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { EuiTableActionsColumnType } from '@elastic/eui/src/components/basic_table/table_types';
import { FormattedMessage } from '@kbn/i18n/react';
import { Required } from 'utility-types';
import { i18n } from '@kbn/i18n';
import {
  IndexPatternField,
  KBN_FIELD_TYPES,
  esQuery,
  esKuery,
  UI_SETTINGS,
  Query,
  IndexPattern,
} from '../../../../../../../../src/plugins/data/public';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { getQueryFromSavedSearch } from '../../../common/util/index_utils';
import { usePageUrlState, useUrlState } from '../../../common/util/url_state';
import {
  DataVisualizerTable,
  ItemIdToExpandedRowMap,
} from '../../../common/components/stats_table';
import { FieldVisConfig } from '../../../common/components/stats_table/types';
import type {
  MetricFieldsStats,
  TotalFieldsStats,
} from '../../../common/components/stats_table/components/field_count_stats';
import { OverallStats } from '../../types/overall_stats';
import { getActions } from '../../../common/components/field_data_row/action_menu';
import { IndexBasedDataVisualizerExpandedRow } from '../../../common/components/expanded_row/index_based_expanded_row';
import { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '../../types/combined_query';
import {
  FieldRequestConfig,
  JobFieldType,
  SavedSearchSavedObject,
} from '../../../../../common/types';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { FieldCountPanel } from '../../../common/components/field_count_panel';
import { DocumentCountContent } from '../../../common/components/document_count_content';
import { DataLoader } from '../../data_loader/data_loader';
import { JOB_FIELD_TYPES } from '../../../../../common';
import { useTimefilter } from '../../hooks/use_time_filter';
import { kbnTypeToJobType } from '../../../common/util/field_types_utils';
import { SearchPanel } from '../search_panel';
import { ActionsPanel } from '../actions_panel';
import { DatePickerWrapper } from '../../../common/components/date_picker_wrapper';
import { mlTimefilterRefresh$ } from '../../services/timefilter_refresh_service';
import { HelpMenu } from '../../../common/components/help_menu';
import { TimeBuckets } from '../../services/time_buckets';

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

export interface IndexDataVisualizerViewProps {
  query: Query;
  currentIndexPattern: IndexPattern; // TODO this should be IndexPattern or null
  currentSavedSearch: SavedSearchSavedObject | null;
}
const restorableDefaults = getDefaultDataVisualizerListState();

export const IndexDataVisualizerView: FC<IndexDataVisualizerViewProps> = (dataVisualizerProps) => {
  const {
    services: { lens: lensPlugin, docLinks, notifications, uiSettings },
  } = useDataVisualizerKibana();
  const { toasts } = notifications;

  const [dataVisualizerListState, setDataVisualizerListState] = usePageUrlState(
    DATA_VISUALIZER_INDEX_VIEWER,
    restorableDefaults
  );
  const [currentSavedSearch, setCurrentSavedSearch] = useState(
    dataVisualizerProps.currentSavedSearch
  );

  const { query, currentIndexPattern } = dataVisualizerProps;

  const getTimeBuckets = useCallback(() => {
    return new TimeBuckets({
      [UI_SETTINGS.HISTOGRAM_MAX_BARS]: uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, [uiSettings]);

  const timefilter = useTimefilter({
    timeRangeSelector: currentIndexPattern.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const dataLoader = useMemo(() => new DataLoader(currentIndexPattern, toasts), [
    currentIndexPattern,
    toasts,
  ]);

  const [globalState, setGlobalState] = useUrlState('_g');
  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
  }, [globalState, timefilter]);

  useEffect(() => {
    if (globalState?.refreshInterval !== undefined) {
      timefilter.setRefreshInterval(globalState.refreshInterval);
    }
  }, [globalState, timefilter]);

  const [lastRefresh, setLastRefresh] = useState(0);

  useEffect(() => {
    if (!currentIndexPattern.isTimeBased()) {
      toasts.addWarning({
        title: i18n.translate(
          'xpack.fileDataVisualizer.indexPatternNotBasedOnTimeSeriesNotificationTitle',
          {
            defaultMessage: 'The index pattern {indexPatternTitle} is not based on a time series',
            values: { indexPatternTitle: currentIndexPattern.title },
          }
        ),
        text: i18n.translate(
          'xpack.fileDataVisualizer.indexPatternNotBasedOnTimeSeriesNotificationDescription',
          {
            defaultMessage: 'Anomaly detection only runs over time-based indices',
          }
        ),
      });
    }
  }, [currentIndexPattern, toasts]);

  // Obtain the list of non metric field types which appear in the index pattern.
  let indexedFieldTypes: JobFieldType[] = [];
  const indexPatternFields: IndexPatternField[] = currentIndexPattern.fields;
  indexPatternFields.forEach((field) => {
    if (field.scripted !== true) {
      const dataVisualizerType: JobFieldType | undefined = kbnTypeToJobType(field);
      if (dataVisualizerType !== undefined && !indexedFieldTypes.includes(dataVisualizerType)) {
        indexedFieldTypes.push(dataVisualizerType);
      }
    }
  });
  indexedFieldTypes = indexedFieldTypes.sort();

  const defaults = getDefaultPageState();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSavedSearch, dataVisualizerListState]);

  const setSearchParams = (searchParams: {
    searchQuery: Query['query'];
    searchString: Query['query'];
    queryLanguage: SearchQueryLanguage;
  }) => {
    // When the user loads saved search and then clear or modify the query
    // we should remove the saved search and replace it with the index pattern id
    if (currentSavedSearch !== null) {
      setCurrentSavedSearch(null);
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, samplerShardSize, lastRefresh]);

  useEffect(() => {
    createMetricCards();
    createNonMetricCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overallStats, showEmptyFields]);

  useEffect(() => {
    loadMetricFieldStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricConfigs]);

  useEffect(() => {
    loadNonMetricFieldStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonMetricConfigs]);

  useEffect(() => {
    createMetricCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsLoaded]);

  useEffect(() => {
    createNonMetricCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonMetricsLoaded]);

  /**
   * Extract query data from the saved search object.
   */
  function extractSearchData(savedSearch: SavedSearchSavedObject | null) {
    if (!savedSearch) {
      return undefined;
    }

    const { query: extractedQuery } = getQueryFromSavedSearch(savedSearch);
    const queryLanguage = extractedQuery.language as SearchQueryLanguage;
    const qryString = extractedQuery.query;
    let qry;
    if (queryLanguage === SEARCH_QUERY_LANGUAGE.KUERY) {
      const ast = esKuery.fromKueryExpression(qryString);
      qry = esKuery.toElasticsearchQuery(ast, currentIndexPattern);
    } else {
      qry = esQuery.luceneStringToDsl(qryString);
      esQuery.decorateQuery(qry, uiSettings.get(UI_SETTINGS.QUERY_STRING_OPTIONS));
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
    const buckets = getTimeBuckets();

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

  const createMetricCards = useCallback(() => {
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
        type: JOB_FIELD_TYPES.NUMBER,
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
        type: JOB_FIELD_TYPES.NUMBER,
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
  }, [
    currentIndexPattern,
    dataLoader,
    indexPatternFields,
    metricsLoaded,
    overallStats,
    showEmptyFields,
  ]);

  const createNonMetricCards = useCallback(() => {
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
      const dataVisualizerType = kbnTypeToJobType(field);
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
  }, [
    currentIndexPattern,
    dataLoader,
    indexPatternFields,
    nonMetricsLoaded,
    overallStats,
    showEmptyFields,
  ]);

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
    [currentIndexPattern, searchQueryLanguage, searchString]
  );

  // Inject custom action column for the index based visualizer
  const extendedColumns = useMemo(() => {
    if (lensPlugin === undefined) {
      // eslint-disable-next-line no-console
      console.error('Lens plugin not available');
      return;
    }
    const actionColumn: EuiTableActionsColumnType<FieldVisConfig> = {
      name: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.indexBasedDataGrid.actionsColumnLabel"
          defaultMessage="Actions"
        />
      ),
      actions: getActions(currentIndexPattern, lensPlugin, { searchQueryLanguage, searchString }),
      width: '100px',
    };

    return [actionColumn];
  }, [currentIndexPattern, lensPlugin, searchQueryLanguage, searchString]);

  const helpLink = docLinks.links.ml.guide;
  return (
    <Fragment>
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
                          query={query}
                          disabled={false}
                          timefilter={timefilter}
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
                  {overallStats?.totalCount !== undefined && (
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
                    extendedColumns={extendedColumns}
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: wizardPanelWidth }}>
                <ActionsPanel
                  indexPattern={currentIndexPattern}
                  searchQueryLanguage={searchQueryLanguage}
                  searchString={searchString}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>

      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};
