/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useMemo, useState } from 'react';
import { merge } from 'rxjs';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
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
  Query,
  esQuery,
  esKuery,
  UI_SETTINGS,
} from '../../../../../../../src/plugins/data/public';
import { SavedSearchSavedObject } from '../../../../common/types/kibana';
import { NavigationMenu } from '../../components/navigation_menu';
import { DatePickerWrapper } from '../../components/navigation_menu/date_picker_wrapper';
import { ML_JOB_FIELD_TYPES } from '../../../../common/constants/field_types';
import { SEARCH_QUERY_LANGUAGE } from '../../../../common/constants/search';
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
import { useUrlState } from '../../util/url_state';
import { FieldRequestConfig, FieldVisConfig } from './common';
import { ActionsPanel } from './components/actions_panel';
import { FieldsPanel } from './components/fields_panel';
import { SearchPanel } from './components/search_panel';
import { DataLoader } from './data_loader';

interface DataVisualizerPageState {
  searchQuery: Query['query'];
  searchString: Query['query'];
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE;
  samplerShardSize: number;
  overallStats: any;
  metricConfigs: FieldVisConfig[];
  totalMetricFieldCount: number;
  populatedMetricFieldCount: number;
  showAllMetrics: boolean;
  metricFieldQuery?: string;
  nonMetricConfigs: FieldVisConfig[];
  totalNonMetricFieldCount: number;
  populatedNonMetricFieldCount: number;
  showAllNonMetrics: boolean;
  nonMetricShowFieldType: ML_JOB_FIELD_TYPES | '*';
  nonMetricFieldQuery?: string;
}

const defaultSearchQuery = {
  match_all: {},
};

function getDefaultPageState(): DataVisualizerPageState {
  return {
    searchString: '',
    searchQuery: defaultSearchQuery,
    searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
    samplerShardSize: 5000,
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
    showAllMetrics: false,
    nonMetricConfigs: [],
    totalNonMetricFieldCount: 0,
    populatedNonMetricFieldCount: 0,
    showAllNonMetrics: false,
    nonMetricShowFieldType: '*',
  };
}

export const Page: FC = () => {
  const mlContext = useMlContext();

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
  let indexedFieldTypes: ML_JOB_FIELD_TYPES[] = [];
  const indexPatternFields: IFieldType[] = currentIndexPattern.fields;
  indexPatternFields.forEach((field) => {
    if (field.scripted !== true) {
      const dataVisualizerType: ML_JOB_FIELD_TYPES | undefined = kbnTypeToMLJobType(field);
      if (
        dataVisualizerType !== undefined &&
        !indexedFieldTypes.includes(dataVisualizerType) &&
        dataVisualizerType !== ML_JOB_FIELD_TYPES.NUMBER
      ) {
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

  const {
    searchQuery: initSearchQuery,
    searchString: initSearchString,
    queryLanguage: initQueryLanguage,
  } = extractSearchData(currentSavedSearch);

  const [searchString, setSearchString] = useState(initSearchString);
  const [searchQuery, setSearchQuery] = useState(initSearchQuery);
  const [searchQueryLanguage, setSearchQueryLanguage] = useState(initQueryLanguage);
  const [samplerShardSize, setSamplerShardSize] = useState(defaults.samplerShardSize);

  // TODO - type overallStats and stats
  const [overallStats, setOverallStats] = useState(defaults.overallStats);

  const [metricConfigs, setMetricConfigs] = useState(defaults.metricConfigs);
  const [totalMetricFieldCount, setTotalMetricFieldCount] = useState(
    defaults.totalMetricFieldCount
  );
  const [populatedMetricFieldCount, setPopulatedMetricFieldCount] = useState(
    defaults.populatedMetricFieldCount
  );
  const [showAllMetrics, setShowAllMetrics] = useState(defaults.showAllMetrics);
  const [metricFieldQuery, setMetricFieldQuery] = useState(defaults.metricFieldQuery);

  const [nonMetricConfigs, setNonMetricConfigs] = useState(defaults.nonMetricConfigs);
  const [totalNonMetricFieldCount, setTotalNonMetricFieldCount] = useState(
    defaults.totalNonMetricFieldCount
  );
  const [populatedNonMetricFieldCount, setPopulatedNonMetricFieldCount] = useState(
    defaults.populatedNonMetricFieldCount
  );
  const [showAllNonMetrics, setShowAllNonMetrics] = useState(defaults.showAllNonMetrics);

  const [nonMetricShowFieldType, setNonMetricShowFieldType] = useState(
    defaults.nonMetricShowFieldType
  );

  const [nonMetricFieldQuery, setNonMetricFieldQuery] = useState(defaults.nonMetricFieldQuery);

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
  }, [overallStats]);

  useEffect(() => {
    loadMetricFieldStats();
  }, [metricConfigs]);

  useEffect(() => {
    loadNonMetricFieldStats();
  }, [nonMetricConfigs]);

  useEffect(() => {
    createMetricCards();
  }, [showAllMetrics, metricFieldQuery]);

  useEffect(() => {
    createNonMetricCards();
  }, [showAllNonMetrics, nonMetricShowFieldType, nonMetricFieldQuery]);

  /**
   * Extract query data from the saved search object.
   */
  function extractSearchData(savedSearch: SavedSearchSavedObject | null) {
    if (!savedSearch) {
      return {
        searchQuery: defaults.searchQuery,
        searchString: defaults.searchString,
        queryLanguage: defaults.searchQueryLanguage,
      };
    }

    const { query } = getQueryFromSavedSearch(savedSearch);
    const queryLanguage = query.language as SEARCH_QUERY_LANGUAGE;
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
        aggInterval.expression
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
        } else {
          // Document count card.
          configWithStats.stats = metricFieldStats.find(
            (fieldStats: any) => fieldStats.fieldName === undefined
          );

          // Add earliest / latest of timefilter for setting x axis domain.
          configWithStats.stats.timeRangeEarliest = earliest;
          configWithStats.stats.timeRangeLatest = latest;
        }
        configWithStats.loading = false;
        configs.push(configWithStats);
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

    let allMetricFields = indexPatternFields.filter((f) => {
      return (
        f.type === KBN_FIELD_TYPES.NUMBER &&
        f.displayName !== undefined &&
        dataLoader.isDisplayField(f.displayName) === true
      );
    });
    if (metricFieldQuery !== undefined) {
      const metricFieldRegexp = new RegExp(`(${metricFieldQuery})`, 'gi');
      allMetricFields = allMetricFields.filter((f) => {
        const addField = f.displayName !== undefined && !!f.displayName.match(metricFieldRegexp);
        return addField;
      });
    }

    const metricExistsFields = allMetricFields.filter((f) => {
      return aggregatableExistsFields.find((existsF) => {
        return existsF.fieldName === f.displayName;
      });
    });

    // Add a config for 'document count', identified by no field name if indexpattern is time based.
    let allFieldCount = allMetricFields.length;
    let popFieldCount = metricExistsFields.length;
    if (currentIndexPattern.timeFieldName !== undefined) {
      configs.push({
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        loading: true,
        aggregatable: true,
      });
      allFieldCount++;
      popFieldCount++;
    }

    // Add on 1 for the document count card.
    setTotalMetricFieldCount(allFieldCount);
    setPopulatedMetricFieldCount(popFieldCount);

    if (allMetricFields.length === metricExistsFields.length && showAllMetrics === false) {
      setShowAllMetrics(true);
      return;
    }

    let aggregatableFields: any[] = overallStats.aggregatableExistsFields;
    if (allMetricFields.length !== metricExistsFields.length && showAllMetrics === true) {
      aggregatableFields = aggregatableFields.concat(overallStats.aggregatableNotExistsFields);
    }

    const metricFieldsToShow = showAllMetrics === true ? allMetricFields : metricExistsFields;

    metricFieldsToShow.forEach((field) => {
      const fieldData = aggregatableFields.find((f) => {
        return f.fieldName === field.displayName;
      });

      if (fieldData !== undefined) {
        const metricConfig: FieldVisConfig = {
          ...fieldData,
          fieldFormat: field.format,
          type: ML_JOB_FIELD_TYPES.NUMBER,
          loading: true,
          aggregatable: true,
        };

        configs.push(metricConfig);
      }
    });

    setMetricConfigs(configs);
  }

  function createNonMetricCards() {
    let allNonMetricFields = [];
    if (nonMetricShowFieldType === '*') {
      allNonMetricFields = indexPatternFields.filter((f) => {
        return (
          f.type !== KBN_FIELD_TYPES.NUMBER &&
          f.displayName !== undefined &&
          dataLoader.isDisplayField(f.displayName) === true
        );
      });
    } else {
      if (
        nonMetricShowFieldType === ML_JOB_FIELD_TYPES.TEXT ||
        nonMetricShowFieldType === ML_JOB_FIELD_TYPES.KEYWORD
      ) {
        const aggregatableCheck =
          nonMetricShowFieldType === ML_JOB_FIELD_TYPES.KEYWORD ? true : false;
        allNonMetricFields = indexPatternFields.filter((f) => {
          return (
            f.displayName !== undefined &&
            dataLoader.isDisplayField(f.displayName) === true &&
            f.type === KBN_FIELD_TYPES.STRING &&
            f.aggregatable === aggregatableCheck
          );
        });
      } else {
        allNonMetricFields = indexPatternFields.filter((f) => {
          return (
            f.type === nonMetricShowFieldType &&
            f.displayName !== undefined &&
            dataLoader.isDisplayField(f.displayName) === true
          );
        });
      }
    }

    // If a field filter has been entered, perform another filter on the entered regexp.
    if (nonMetricFieldQuery !== undefined) {
      const nonMetricFieldRegexp = new RegExp(`(${nonMetricFieldQuery})`, 'gi');
      allNonMetricFields = allNonMetricFields.filter(
        (f) => f.displayName !== undefined && f.displayName.match(nonMetricFieldRegexp)
      );
    }

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

    setTotalNonMetricFieldCount(allNonMetricFields.length);
    setPopulatedNonMetricFieldCount(nonMetricFieldData.length);

    if (allNonMetricFields.length === nonMetricFieldData.length && showAllNonMetrics === false) {
      setShowAllNonMetrics(true);
      return;
    }

    if (allNonMetricFields.length !== nonMetricFieldData.length && showAllNonMetrics === true) {
      // Combine the field data obtained from Elasticsearch into a single array.
      nonMetricFieldData = nonMetricFieldData.concat(
        overallStats.aggregatableNotExistsFields,
        overallStats.nonAggregatableNotExistsFields
      );
    }

    const nonMetricFieldsToShow =
      showAllNonMetrics === true ? allNonMetricFields : populatedNonMetricFields;

    const configs: FieldVisConfig[] = [];

    nonMetricFieldsToShow.forEach((field) => {
      const fieldData = nonMetricFieldData.find((f) => f.fieldName === field.displayName);

      const nonMetricConfig = {
        ...fieldData,
        fieldFormat: field.format,
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
                  <SearchPanel
                    indexPattern={currentIndexPattern}
                    searchString={searchString}
                    setSearchString={setSearchString}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchQueryLanguage={searchQueryLanguage}
                    setSearchQueryLanguage={setSearchQueryLanguage}
                    samplerShardSize={samplerShardSize}
                    setSamplerShardSize={setSamplerShardSize}
                    totalCount={overallStats.totalCount}
                  />
                  <EuiHorizontalRule />
                  <EuiFlexGroup gutterSize="m">
                    <EuiFlexItem>
                      {totalMetricFieldCount > 0 && (
                        <Fragment>
                          <FieldsPanel
                            title={i18n.translate(
                              'xpack.ml.datavisualizer.page.metricsPanelTitle',
                              {
                                defaultMessage: 'Metrics',
                              }
                            )}
                            totalFieldCount={totalMetricFieldCount}
                            populatedFieldCount={populatedMetricFieldCount}
                            fieldTypes={[ML_JOB_FIELD_TYPES.NUMBER]}
                            showFieldType={ML_JOB_FIELD_TYPES.NUMBER}
                            showAllFields={showAllMetrics}
                            setShowAllFields={setShowAllMetrics}
                            fieldSearchBarQuery={metricFieldQuery}
                            setFieldSearchBarQuery={setMetricFieldQuery}
                            fieldVisConfigs={metricConfigs}
                          />
                          <EuiSpacer size="xl" />
                        </Fragment>
                      )}
                      <FieldsPanel
                        title={i18n.translate('xpack.ml.datavisualizer.page.fieldsPanelTitle', {
                          defaultMessage: 'Fields',
                        })}
                        totalFieldCount={totalNonMetricFieldCount}
                        populatedFieldCount={populatedNonMetricFieldCount}
                        showAllFields={showAllNonMetrics}
                        setShowAllFields={setShowAllNonMetrics}
                        fieldTypes={indexedFieldTypes}
                        showFieldType={nonMetricShowFieldType}
                        setShowFieldType={setNonMetricShowFieldType}
                        fieldSearchBarQuery={nonMetricFieldQuery}
                        setFieldSearchBarQuery={setNonMetricFieldQuery}
                        fieldVisConfigs={nonMetricConfigs}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
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
    </Fragment>
  );
};
