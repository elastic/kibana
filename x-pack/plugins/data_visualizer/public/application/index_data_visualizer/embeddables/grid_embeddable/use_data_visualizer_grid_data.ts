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
import { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { getEsQueryFromSavedSearch } from '../../utils/saved_search_utils';
import { MetricFieldsStats } from '../../../common/components/stats_table/components/field_count_stats';
import { DataLoader } from '../../data_loader/data_loader';
import { useTimefilter } from '../../hooks/use_time_filter';
import { dataVisualizerRefresh$ } from '../../services/timefilter_refresh_service';
import { TimeBuckets } from '../../services/time_buckets';
import {
  DataViewField,
  KBN_FIELD_TYPES,
  UI_SETTINGS,
} from '../../../../../../../../src/plugins/data/common';
import { extractErrorProperties } from '../../utils/error_utils';
import { FieldVisConfig } from '../../../common/components/stats_table/types';
import { FieldRequestConfig, JOB_FIELD_TYPES } from '../../../../../common';
import { kbnTypeToJobType } from '../../../common/util/field_types_utils';
import { getActions } from '../../../common/components/field_data_row/action_menu';
import { DataVisualizerGridEmbeddableInput } from './grid_embeddable';
import { getDefaultPageState } from '../../components/index_data_visualizer_view/index_data_visualizer_view';

const defaults = getDefaultPageState();

export const useDataVisualizerGridData = (
  input: DataVisualizerGridEmbeddableInput,
  dataVisualizerListState: Required<DataVisualizerIndexBasedAppState>
) => {
  const { services } = useDataVisualizerKibana();
  const { notifications, uiSettings } = services;
  const { toasts } = notifications;
  const { samplerShardSize, visibleFieldTypes, showEmptyFields } = dataVisualizerListState;

  const [lastRefresh, setLastRefresh] = useState(0);

  const {
    currentSavedSearch,
    currentIndexPattern,
    currentQuery,
    currentFilters,
    visibleFieldNames,
  } = useMemo(
    () => ({
      currentSavedSearch: input?.savedSearch,
      currentIndexPattern: input.indexPattern,
      currentQuery: input?.query,
      visibleFieldNames: input?.visibleFieldNames ?? [],
      currentFilters: input?.filters,
    }),
    [input]
  );

  const { searchQueryLanguage, searchString, searchQuery } = useMemo(() => {
    const searchData = getEsQueryFromSavedSearch({
      indexPattern: currentIndexPattern,
      uiSettings,
      savedSearch: currentSavedSearch,
      query: currentQuery,
      filters: currentFilters,
    });

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
  }, [
    currentSavedSearch,
    currentIndexPattern,
    dataVisualizerListState,
    currentQuery,
    currentFilters,
  ]);

  const [overallStats, setOverallStats] = useState(defaults.overallStats);

  const [documentCountStats, setDocumentCountStats] = useState(defaults.documentCountStats);
  const [metricConfigs, setMetricConfigs] = useState(defaults.metricConfigs);
  const [metricsLoaded, setMetricsLoaded] = useState(defaults.metricsLoaded);
  const [metricsStats, setMetricsStats] = useState<undefined | MetricFieldsStats>();

  const [nonMetricConfigs, setNonMetricConfigs] = useState(defaults.nonMetricConfigs);
  const [nonMetricsLoaded, setNonMetricsLoaded] = useState(defaults.nonMetricsLoaded);

  const dataLoader = useMemo(
    () => new DataLoader(currentIndexPattern, toasts),
    [currentIndexPattern, toasts]
  );

  const timefilter = useTimefilter({
    timeRangeSelector: currentIndexPattern?.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getTimeUpdate$(),
      dataVisualizerRefresh$
    ).subscribe(() => {
      setLastRefresh(Date.now());
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  const getTimeBuckets = useCallback(() => {
    return new TimeBuckets({
      [UI_SETTINGS.HISTOGRAM_MAX_BARS]: uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, [uiSettings]);

  const indexPatternFields: DataViewField[] = useMemo(
    () => currentIndexPattern.fields,
    [currentIndexPattern]
  );

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
      // Because load overall stats perform queries in batches
      // there could be multiple errors
      if (Array.isArray(allStats.errors) && allStats.errors.length > 0) {
        allStats.errors.forEach((err: any) => {
          dataLoader.displayError(extractErrorProperties(err));
        });
      }
      setOverallStats(allStats);
    } catch (err) {
      dataLoader.displayError(err.body ?? err);
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
        return existsF.fieldName === f.spec.name;
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
        return f.fieldName === field.spec.name;
      });

      const metricConfig: FieldVisConfig = {
        ...(fieldData ? fieldData : {}),
        fieldFormat: currentIndexPattern.getFormatterForField(field),
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

      const nonMetricConfig = {
        ...(fieldData ? fieldData : {}),
        fieldFormat: currentIndexPattern.getFormatterForField(field),
        aggregatable: field.aggregatable,
        scripted: field.scripted,
        loading: fieldData?.existsInDocs,
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
        nonMetricConfig.type = field.type;
        nonMetricConfig.isUnsupportedType = true;
      }

      if (field.displayName !== nonMetricConfig.fieldName) {
        nonMetricConfig.displayName = field.displayName;
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
      input.indexPattern,
      { lens: services.lens },
      {
        searchQueryLanguage,
        searchString,
      },
      actionFlyoutRef
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
  }, [input.indexPattern, services, searchQueryLanguage, searchString]);

  return {
    configs,
    searchQueryLanguage,
    searchString,
    searchQuery,
    extendedColumns,
    documentCountStats,
    metricsStats,
    loaded: metricsLoaded && nonMetricsLoaded,
  };
};
