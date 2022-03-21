/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Required } from 'utility-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { merge } from 'rxjs';
import { EuiTableActionsColumnType } from '@elastic/eui/src/components/basic_table/table_types';
import { i18n } from '@kbn/i18n';
import { DataVisualizerIndexBasedAppState } from '../types/index_data_visualizer_state';
import { useDataVisualizerKibana } from '../../kibana_context';
import { getEsQueryFromSavedSearch } from '../utils/saved_search_utils';
import { MetricFieldsStats } from '../../common/components/stats_table/components/field_count_stats';
import { useTimefilter } from './use_time_filter';
import { dataVisualizerRefresh$ } from '../services/timefilter_refresh_service';
import { TimeBuckets } from '../../../../common/services/time_buckets';
import {
  DataViewField,
  KBN_FIELD_TYPES,
  UI_SETTINGS,
} from '../../../../../../../src/plugins/data/common';
import { FieldVisConfig } from '../../common/components/stats_table/types';
import {
  JOB_FIELD_TYPES,
  NON_AGGREGATABLE_FIELD_TYPES,
  OMIT_FIELDS,
} from '../../../../common/constants';
import type { FieldRequestConfig, JobFieldType } from '../../../../common/types';
import { kbnTypeToJobType } from '../../common/util/field_types_utils';
import { getActions } from '../../common/components/field_data_row/action_menu';
import { DataVisualizerGridInput } from '../embeddables/grid_embeddable/grid_embeddable';
import { getDefaultPageState } from '../components/index_data_visualizer_view/index_data_visualizer_view';
import { useFieldStatsSearchStrategy } from './use_field_stats';
import { useOverallStats } from './use_overall_stats';
import { OverallStatsSearchStrategyParams } from '../../../../common/types/field_stats';
import { Dictionary } from '../../common/util/url_state';
import { AggregatableField, NonAggregatableField } from '../types/overall_stats';

const defaults = getDefaultPageState();

function isDisplayField(fieldName: string): boolean {
  return !OMIT_FIELDS.includes(fieldName);
}

export const useDataVisualizerGridData = (
  input: DataVisualizerGridInput,
  dataVisualizerListState: Required<DataVisualizerIndexBasedAppState>,
  onUpdate?: (params: Dictionary<unknown>) => void
) => {
  const { services } = useDataVisualizerKibana();
  const { uiSettings, data } = services;
  const { samplerShardSize, visibleFieldTypes, showEmptyFields } = dataVisualizerListState;

  const [lastRefresh, setLastRefresh] = useState(0);
  const searchSessionId = input.sessionId;

  const {
    currentSavedSearch,
    currentDataView,
    currentQuery,
    currentFilters,
    visibleFieldNames,
    fieldsToFetch,
  } = useMemo(
    () => ({
      currentSavedSearch: input?.savedSearch,
      currentDataView: input.dataView,
      currentQuery: input?.query,
      visibleFieldNames: input?.visibleFieldNames ?? [],
      currentFilters: input?.filters,
      fieldsToFetch: input?.fieldsToFetch,
    }),
    [input]
  );

  /** Prepare required params to pass to search strategy **/
  const { searchQueryLanguage, searchString, searchQuery } = useMemo(() => {
    const searchData = getEsQueryFromSavedSearch({
      dataView: currentDataView,
      uiSettings,
      savedSearch: currentSavedSearch,
      query: currentQuery,
      filters: currentFilters,
      filterManager: data.query.filterManager,
    });

    if (searchData === undefined || dataVisualizerListState.searchString !== '') {
      if (dataVisualizerListState.filters) {
        data.query.filterManager.setFilters(dataVisualizerListState.filters);
      }
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
  }, [
    currentSavedSearch?.id,
    currentDataView.id,
    dataVisualizerListState.searchString,
    dataVisualizerListState.searchQueryLanguage,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify({
      searchQuery: dataVisualizerListState.searchQuery,
      currentQuery,
      currentFilters,
    }),
    lastRefresh,
  ]);

  const _timeBuckets = useMemo(() => {
    return new TimeBuckets({
      [UI_SETTINGS.HISTOGRAM_MAX_BARS]: uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, [uiSettings]);

  const timefilter = useTimefilter({
    timeRangeSelector: currentDataView?.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const [metricConfigs, setMetricConfigs] = useState(defaults.metricConfigs);
  const [metricsLoaded, setMetricsLoaded] = useState(defaults.metricsLoaded);
  const [metricsStats, setMetricsStats] = useState<undefined | MetricFieldsStats>();

  const [nonMetricConfigs, setNonMetricConfigs] = useState(defaults.nonMetricConfigs);
  const [nonMetricsLoaded, setNonMetricsLoaded] = useState(defaults.nonMetricsLoaded);

  /** Search strategy **/
  const fieldStatsRequest: OverallStatsSearchStrategyParams | undefined = useMemo(
    () => {
      // Obtain the interval to use for date histogram aggregations
      // (such as the document count chart). Aim for 75 bars.
      const buckets = _timeBuckets;

      const tf = timefilter;

      if (!buckets || !tf || !currentDataView) return;

      const activeBounds = tf.getActiveBounds();

      let earliest: number | undefined;
      let latest: number | undefined;
      if (activeBounds !== undefined && currentDataView.timeFieldName !== undefined) {
        earliest = activeBounds.min?.valueOf();
        latest = activeBounds.max?.valueOf();
      }

      const bounds = tf.getActiveBounds();
      const BAR_TARGET = 75;
      buckets.setInterval('auto');

      if (bounds) {
        buckets.setBounds(bounds);
        buckets.setBarTarget(BAR_TARGET);
      }

      const aggInterval = buckets.getInterval();

      const aggregatableFields: string[] = [];
      const nonAggregatableFields: string[] = [];

      const fields = currentDataView.fields;
      fields?.forEach((field) => {
        if (fieldsToFetch && !fieldsToFetch.includes(field.name)) {
          return;
        }
        const fieldName = field.displayName !== undefined ? field.displayName : field.name;
        if (!OMIT_FIELDS.includes(fieldName)) {
          if (field.aggregatable === true && !NON_AGGREGATABLE_FIELD_TYPES.has(field.type)) {
            aggregatableFields.push(field.name);
          } else {
            nonAggregatableFields.push(field.name);
          }
        }
      });
      return {
        earliest,
        latest,
        aggInterval,
        intervalMs: aggInterval?.asMilliseconds(),
        searchQuery,
        samplerShardSize,
        sessionId: searchSessionId,
        index: currentDataView.title,
        timeFieldName: currentDataView.timeFieldName,
        runtimeFieldMap: currentDataView.getRuntimeMappings(),
        aggregatableFields,
        nonAggregatableFields,
        fieldsToFetch,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      _timeBuckets,
      timefilter,
      currentDataView.id,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(searchQuery),
      samplerShardSize,
      searchSessionId,
      lastRefresh,
      fieldsToFetch,
    ]
  );

  const { overallStats, progress: overallStatsProgress } = useOverallStats(
    fieldStatsRequest,
    lastRefresh
  );

  const configsWithoutStats = useMemo(() => {
    if (overallStatsProgress.loaded < 100) return;
    const existMetricFields = metricConfigs
      .map((config) => {
        return {
          fieldName: config.fieldName,
          type: config.type,
          cardinality: config.stats?.cardinality ?? 0,
          existsInDocs: config.existsInDocs,
        };
      })
      .filter((c) => c !== undefined) as FieldRequestConfig[];

    // Pass the field name, type and cardinality in the request.
    // Top values will be obtained on a sample if cardinality > 100000.
    const existNonMetricFields: FieldRequestConfig[] = nonMetricConfigs
      .map((config) => {
        return {
          fieldName: config.fieldName,
          type: config.type,
          cardinality: config.stats?.cardinality ?? 0,
          existsInDocs: config.existsInDocs,
        };
      })
      .filter((c) => c !== undefined) as FieldRequestConfig[];

    return { metricConfigs: existMetricFields, nonMetricConfigs: existNonMetricFields };
  }, [metricConfigs, nonMetricConfigs, overallStatsProgress.loaded]);

  const strategyResponse = useFieldStatsSearchStrategy(
    fieldStatsRequest,
    configsWithoutStats,
    dataVisualizerListState
  );

  const combinedProgress = useMemo(
    () => overallStatsProgress.loaded * 0.2 + strategyResponse.progress.loaded * 0.8,
    [overallStatsProgress.loaded, strategyResponse.progress.loaded]
  );

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getTimeUpdate$(),
      timefilter.getAutoRefreshFetch$(),
      dataVisualizerRefresh$
    ).subscribe(() => {
      if (onUpdate) {
        onUpdate({
          time: timefilter.getTime(),
          refreshInterval: timefilter.getRefreshInterval(),
        });
      }
      setLastRefresh(Date.now());
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  const dataViewFields: DataViewField[] = useMemo(() => currentDataView.fields, [currentDataView]);

  const createMetricCards = useCallback(() => {
    const configs: FieldVisConfig[] = [];
    const aggregatableExistsFields: AggregatableField[] =
      overallStats.aggregatableExistsFields || [];

    const allMetricFields = dataViewFields.filter((f) => {
      return (
        f.type === KBN_FIELD_TYPES.NUMBER &&
        f.displayName !== undefined &&
        isDisplayField(f.displayName) === true
      );
    });
    const metricExistsFields = allMetricFields.filter((f) => {
      return aggregatableExistsFields.find((existsF) => {
        return existsF.fieldName === f.spec.name;
      });
    });

    if (metricsLoaded === false) {
      setMetricsLoaded(true);
      return;
    }

    let aggregatableFields: AggregatableField[] = overallStats.aggregatableExistsFields;
    if (allMetricFields.length !== metricExistsFields.length && metricsLoaded === true) {
      aggregatableFields = aggregatableFields.concat(overallStats.aggregatableNotExistsFields);
    }

    const metricFieldsToShow =
      metricsLoaded === true && showEmptyFields === true ? allMetricFields : metricExistsFields;

    metricFieldsToShow.forEach((field) => {
      const fieldData = aggregatableFields.find((f) => {
        return f.fieldName === field.spec.name;
      });
      if (!fieldData) return;

      const metricConfig: FieldVisConfig = {
        ...fieldData,
        fieldFormat: currentDataView.getFormatterForField(field),
        type: JOB_FIELD_TYPES.NUMBER,
        loading: true,
        aggregatable: true,
        deletable: field.runtimeField !== undefined,
      };
      if (field.displayName !== metricConfig.fieldName) {
        metricConfig.displayName = field.displayName;
      }

      configs.push(metricConfig);
    });

    setMetricsStats({
      totalMetricFieldsCount: allMetricFields.length,
      visibleMetricsCount: metricFieldsToShow.length,
    });
    setMetricConfigs(configs);
  }, [currentDataView, dataViewFields, metricsLoaded, overallStats, showEmptyFields]);

  const createNonMetricCards = useCallback(() => {
    const allNonMetricFields = dataViewFields.filter((f) => {
      return (
        f.type !== KBN_FIELD_TYPES.NUMBER &&
        f.displayName !== undefined &&
        isDisplayField(f.displayName) === true
      );
    });
    // Obtain the list of all non-metric fields which appear in documents
    // (aggregatable or not aggregatable).
    const populatedNonMetricFields: DataViewField[] = []; // Kibana index pattern non metric fields.
    let nonMetricFieldData: Array<AggregatableField | NonAggregatableField> = []; // Basic non metric field data loaded from requesting overall stats.
    const aggregatableExistsFields: AggregatableField[] =
      overallStats.aggregatableExistsFields || [];
    const nonAggregatableExistsFields: NonAggregatableField[] =
      overallStats.nonAggregatableExistsFields || [];

    allNonMetricFields.forEach((f) => {
      const checkAggregatableField = aggregatableExistsFields.find(
        (existsField) => existsField.fieldName === f.spec.name
      );

      if (checkAggregatableField !== undefined) {
        populatedNonMetricFields.push(f);
        nonMetricFieldData.push(checkAggregatableField);
      } else {
        const checkNonAggregatableField = nonAggregatableExistsFields.find(
          (existsField) => existsField.fieldName === f.spec.name
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
      const fieldData = nonMetricFieldData.find((f) => f.fieldName === field.spec.name);

      const nonMetricConfig: Partial<FieldVisConfig> = {
        ...(fieldData ? fieldData : {}),
        fieldFormat: currentDataView.getFormatterForField(field),
        aggregatable: field.aggregatable,
        loading: fieldData?.existsInDocs ?? true,
        deletable: field.runtimeField !== undefined,
      };

      // Map the field type from the Kibana index pattern to the field type
      // used in the data visualizer.
      const dataVisualizerType = kbnTypeToJobType(field);
      if (dataVisualizerType !== undefined) {
        nonMetricConfig.type = dataVisualizerType;
      } else {
        // Add a flag to indicate that this is one of the 'other' Kibana
        // field types that do not yet have a specific card type.
        nonMetricConfig.type = field.type as JobFieldType;
        nonMetricConfig.isUnsupportedType = true;
      }

      if (field.displayName !== nonMetricConfig.fieldName) {
        nonMetricConfig.displayName = field.displayName;
      }

      configs.push(nonMetricConfig as FieldVisConfig);
    });

    setNonMetricConfigs(configs);
  }, [currentDataView, dataViewFields, nonMetricsLoaded, overallStats, showEmptyFields]);

  useEffect(() => {
    createMetricCards();
    createNonMetricCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overallStats, showEmptyFields]);

  const configs = useMemo(
    () => {
      const fieldStats = strategyResponse.fieldStats;
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

      if (fieldStats) {
        combinedConfigs = combinedConfigs.map((c) => {
          const loadedFullStats = fieldStats.get(c.fieldName) ?? {};
          return loadedFullStats
            ? {
                ...c,
                loading: false,
                stats: { ...c.stats, ...loadedFullStats },
              }
            : c;
        });
      }

      return combinedConfigs;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      nonMetricConfigs,
      metricConfigs,
      visibleFieldTypes,
      visibleFieldNames,
      strategyResponse.progress.loaded,
      dataVisualizerListState.pageIndex,
      dataVisualizerListState.pageSize,
    ]
  );

  // Some actions open up fly-out or popup
  // This variable is used to keep track of them and clean up when unmounting
  const actionFlyoutRef = useRef<() => void | undefined>();
  useEffect(() => {
    const ref = actionFlyoutRef;
    return () => {
      // Clean up any of the flyout/editor opened from the actions
      if (ref.current) {
        ref.current();
      }
    };
  }, []);

  // Inject custom action column for the index based visualizer
  // Hide the column completely if no access to any of the plugins
  const extendedColumns = useMemo(() => {
    const actions = getActions(
      input.dataView,
      services,
      {
        searchQueryLanguage,
        searchString,
      },
      input.allowEditDataView ? actionFlyoutRef : undefined
    );
    if (!Array.isArray(actions) || actions.length < 1) return;

    const actionColumn: EuiTableActionsColumnType<FieldVisConfig> = {
      name: i18n.translate('xpack.dataVisualizer.index.dataGrid.actionsColumnLabel', {
        defaultMessage: 'Actions',
      }),
      actions,
      width: '70px',
    };

    return [actionColumn];
  }, [input.dataView, services, searchQueryLanguage, searchString, input.allowEditDataView]);

  return {
    progress: combinedProgress,
    configs,
    searchQueryLanguage,
    searchString,
    searchQuery,
    extendedColumns,
    documentCountStats: overallStats.documentCountStats,
    documentCountStatsRandom: overallStats.documentCountStatsRandom,
    metricsStats,
    overallStats,
    timefilter,
    setLastRefresh,
  };
};
