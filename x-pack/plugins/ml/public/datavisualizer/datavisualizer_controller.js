/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
  * Angular controller for the Machine Learning data visualizer which allows the user
  * to explore the data in the fields in an index pattern prior to creating a job.
  */

import _ from 'lodash';
import rison from 'rison-node';

import 'plugins/ml/components/form_filter_input';

import chrome from 'ui/chrome';
import uiRoutes from 'ui/routes';
import { decorateQuery, luceneStringToDsl } from '@kbn/es-query';
import { notify, toastNotifications } from 'ui/notify';

import { ML_JOB_FIELD_TYPES, KBN_FIELD_TYPES } from 'plugins/ml/../common/constants/field_types';
import { getDataVisualizerBreadcrumbs } from './breadcrumbs';
import { kbnTypeToMLJobType } from 'plugins/ml/util/field_types_utils';
import { IntervalHelperProvider } from 'plugins/ml/util/ml_time_buckets';
import { checkBasicLicense, isFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { SearchItemsProvider } from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import { loadCurrentIndexPattern, loadCurrentSavedSearch, timeBasedIndexCheck } from 'plugins/ml/util/index_utils';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { ml } from 'plugins/ml/services/ml_api_service';
import template from './datavisualizer.html';

uiRoutes
  .when('/jobs/new_job/datavisualizer', {
    template,
    k7Breadcrumbs: getDataVisualizerBreadcrumbs,
    resolve: {
      CheckLicense: checkBasicLicense,
      privileges: checkGetJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      savedSearch: loadCurrentSavedSearch,
      checkMlNodesAvailable
    }
  });

import { timefilter } from 'ui/timefilter';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .controller('MlDataVisualizerViewFields', function (
    $scope,
    $timeout,
    $window,
    Private,
    AppState,
    config,
    i18n) {

    timefilter.enableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    const createSearchItems = Private(SearchItemsProvider);
    const {
      indexPattern,
      query } = createSearchItems();

    timeBasedIndexCheck(indexPattern, true);

    // List of system fields we don't want to display.
    // TODO - are we happy to ignore these fields?
    const OMIT_FIELDS = ['_source', '_type', '_index', '_id', '_version', '_score'];

    $scope.metricCards = [];
    $scope.totalMetricFieldCount = 0;
    $scope.populatedMetricFieldCount = 0;
    $scope.showAllMetrics = false;
    $scope.fieldCards = [];
    $scope.totalNonMetricFieldCount = 0;
    $scope.populatedNonMetricFieldCount = 0;
    $scope.ML_JOB_FIELD_TYPES = ML_JOB_FIELD_TYPES;
    $scope.showAllFields = false;
    $scope.filterFieldType = '*';
    $scope.urlBasePath = chrome.getBasePath();
    $scope.appState = new AppState();

    $scope.indexPattern = indexPattern;
    $scope.earliest = timefilter.getActiveBounds().min.valueOf();
    $scope.latest = timefilter.getActiveBounds().max.valueOf();

    $scope.metricFilterIcon = 0;
    $scope.metricFieldFilter = '';
    $scope.fieldFilterIcon = 0;
    $scope.fieldFilter = '';
    $scope.recognizerResults = { count: 0 };

    $scope.showSidebar = isFullLicense();

    // Check for a saved query in the AppState or via a savedSearchId in the URL.
    // TODO - add in support for lucene queries with filters and Kuery.
    $scope.searchQueryText = '';
    const queryBarQry = ($scope.appState.query !== undefined) ? ($scope.appState.query) : query;
    if (queryBarQry.language === 'lucene') {
      $scope.searchQueryText = _.get(queryBarQry, 'query', '');
    } else {
      toastNotifications.addWarning({
        title: i18n('xpack.ml.datavisualizer.languageSyntaxNotSupportedWarningTitle', {
          defaultMessage: '{language} syntax not supported',
          values: {
            language: (queryBarQry.language !== undefined) ? queryBarQry.language : '',
          }
        }),
        text: i18n('xpack.ml.datavisualizer.languageSyntaxNotSupportedWarningDescription', {
          defaultMessage: 'The Data Visualizer currently only supports queries using the lucene query syntax.',
        }),
      });
    }

    $scope.searchQuery = buildSearchQuery();

    $scope.samplerShardSize = $scope.appState.samplerShardSize ?
      $scope.appState.samplerShardSize : 5000;     // -1 indicates no sampling.

    const MlTimeBuckets = Private(IntervalHelperProvider);

    let metricFieldRegexp;
    let metricFieldFilterTimeout;
    let fieldRegexp;
    let fieldFilterTimeout;

    // Obtain the list of non metric field types which appear in the index pattern.
    let indexedFieldTypes = [];
    _.each(indexPattern.fields, (field) => {
      if (!field.scripted) {
        const dataVisualizerType = kbnTypeToMLJobType(field);
        if (dataVisualizerType !== undefined) {
          indexedFieldTypes.push(dataVisualizerType);
        }
      }
    });
    indexedFieldTypes = _.chain(indexedFieldTypes)
      .unique()
      .without(ML_JOB_FIELD_TYPES.NUMBER)
      .value();
    $scope.indexedFieldTypes = indexedFieldTypes.sort();


    // Refresh the data when the time range is altered.
    $scope.$listenAndDigestAsync(timefilter, 'fetch', function () {
      $scope.earliest = timefilter.getActiveBounds().min.valueOf();
      $scope.latest = timefilter.getActiveBounds().max.valueOf();
      loadOverallStats();
    });

    $scope.submitSearchQuery = function () {
      $scope.searchQuery = buildSearchQuery();
      saveAppState();
      loadOverallStats();
    };

    $scope.samplerShardSizeChanged = function () {
      saveAppState();
      loadOverallStats();
    };

    $scope.toggleAllMetrics = function () {
      $scope.showAllMetrics = !$scope.showAllMetrics;
      createMetricCards();
    };

    $scope.toggleAllFields = function () {
      $scope.showAllFields = !$scope.showAllFields;
      createNonMetricCards();
    };

    $scope.filterFieldTypeChanged = function (fieldType) {
      $scope.filterFieldType = fieldType;
      createNonMetricCards();
    };

    $scope.metricFieldFilterChanged = function () {
      // Clear the previous filter timeout.
      if (metricFieldFilterTimeout !== undefined) {
        $timeout.cancel(metricFieldFilterTimeout);
      }

      // Create a timeout to recreate the metric configurations based on the filter.
      // A timeout of 1.5s is used as the user may still be in the process of typing the filter
      // when this function is first called.
      metricFieldFilterTimeout = $timeout(() => {
        if ($scope.metricFieldFilter && $scope.metricFieldFilter !== '') {
          metricFieldRegexp = new RegExp('(' + $scope.metricFieldFilter + ')', 'gi');
        } else {
          metricFieldRegexp = undefined;
        }

        createMetricCards();
        metricFieldFilterTimeout = undefined;
      }, 1500);

      // Display the spinner icon after 250ms of typing.
      // The spinner is a nice way of showing that something is
      // happening as we're stalling for the user to stop typing.
      $timeout(() => {
        $scope.metricFilterIcon = 1;
      }, 250);

    };

    $scope.clearMetricFilter = function () {
      $scope.metricFieldFilter = '';
      metricFieldRegexp = undefined;
      createMetricCards();
    };

    $scope.fieldFilterChanged = function () {
    // Clear the previous filter timeout.
      if (fieldFilterTimeout !== undefined) {
        $timeout.cancel(fieldFilterTimeout);
      }

      // Create a timeout to recreate the non-metric field configurations based on the filter.
      // A timeout of 1.5s is used as the user may still be in the process of typing the filter
      // when this function is first called.
      fieldFilterTimeout = $timeout(() => {
        if ($scope.fieldFilter && $scope.fieldFilter !== '') {
          fieldRegexp = new RegExp('(' + $scope.fieldFilter + ')', 'gi');
        } else {
          fieldRegexp = undefined;
        }

        createNonMetricCards();
        fieldFilterTimeout = undefined;
      }, 1500);

      // Display the spinner icon after 250ms of typing.
      // the spinner is a nice way of showing that something is
      // happening as we're stalling for the user to stop trying.
      $timeout(() => {
        $scope.fieldFilterIcon = 1;
      }, 250);
    };

    $scope.clearFieldFilter = function () {
      $scope.fieldFilter = '';
      fieldRegexp = undefined;
      createNonMetricCards();
    };

    $scope.createJob = function () {
    // TODO - allow the user to select metrics and fields and use
    // the selection to open the appropriate job wizard (single, multi-metric etc).
    // For now just open the Advanced wizard, passing in the index pattern ID.
      const _a = rison.encode({
        query: {
          language: 'lucene',
          query: $scope.searchQueryText
        }
      });

      const path = `${$scope.urlBasePath}/app/ml#/jobs/new_job/advanced?index=${$scope.indexPattern}&_a=${_a}`;
      $window.open(path, '_self');
    };

    function buildSearchQuery() {
      const searchQuery = luceneStringToDsl($scope.searchQueryText);
      const queryStringOptions = config.get('query:queryString:options');
      decorateQuery(searchQuery, queryStringOptions);
      return searchQuery;
    }

    function saveAppState() {
      $scope.appState.query = {
        language: 'lucene',
        query: $scope.searchQueryText
      };
      $scope.appState.samplerShardSize = $scope.samplerShardSize;
      $scope.appState.save();
    }

    function createMetricCards() {
      $scope.metricCards.length = 0;

      const aggregatableExistsFields = $scope.overallStats.aggregatableExistsFields || [];

      let allMetricFields = [];
      if (metricFieldRegexp === undefined) {
        allMetricFields = _.filter(indexPattern.fields, (f) => {
          return (f.type === KBN_FIELD_TYPES.NUMBER && !_.contains(OMIT_FIELDS, f.displayName));
        });
      } else {
        allMetricFields = _.filter(indexPattern.fields, (f) => {
          return (f.type === KBN_FIELD_TYPES.NUMBER &&
          !_.contains(OMIT_FIELDS, f.displayName) &&
          f.displayName.match(metricFieldRegexp));
        });
      }

      const metricExistsFields = _.filter(allMetricFields, (f) => {
        return _.find(aggregatableExistsFields, { fieldName: f.displayName });
      });

      const metricCards = [];

      // Add a config for 'document count', identified by no field name if index is timeseries based
      if (indexPattern.timeFieldName !== undefined) {
        metricCards.push({
          type: ML_JOB_FIELD_TYPES.NUMBER,
          existsInDocs: true,
          loading: true
        });
      } else {
        // disable timeRangeSelector and remove sidebar if index not timeseries based
        timefilter.disableTimeRangeSelector();
        $scope.showSidebar = false;
      }

      // Add on 1 for the document count card.
      // TODO - remove the '+1' if document count goes in its own section.
      $scope.totalMetricFieldCount = allMetricFields.length + 1;
      $scope.populatedMetricFieldCount = metricExistsFields.length + 1;
      if ($scope.totalMetricFieldCount === $scope.populatedMetricFieldCount) {
        $scope.showAllMetrics = true;
      }

      let aggregatableFields = $scope.overallStats.aggregatableExistsFields;
      if ($scope.showAllMetrics === true) {
        aggregatableFields = aggregatableFields.concat($scope.overallStats.aggregatableNotExistsFields);
      }

      const metricFields = $scope.showAllMetrics ? allMetricFields : metricExistsFields;
      _.each(metricFields, (field) => {
        const fieldData = _.find(aggregatableFields, { fieldName: field.displayName });

        const card = {
          ...fieldData,
          fieldFormat: field.format,
          type: ML_JOB_FIELD_TYPES.NUMBER,
          loading: true
        };

        metricCards.push(card);

      });

      $scope.metricCards = metricCards;
      loadMetricFieldStats();
    }

    function createNonMetricCards() {
      $scope.fieldCards.length = 0;

      let allNonMetricFields = [];
      if ($scope.filterFieldType === '*') {
        allNonMetricFields = _.filter(indexPattern.fields, (f) => {
          return (f.type !== KBN_FIELD_TYPES.NUMBER && !_.contains(OMIT_FIELDS, f.displayName));
        });
      } else {
        if ($scope.filterFieldType === ML_JOB_FIELD_TYPES.TEXT ||
            $scope.filterFieldType === ML_JOB_FIELD_TYPES.KEYWORD)  {
          const aggregatableCheck = $scope.filterFieldType === ML_JOB_FIELD_TYPES.KEYWORD ? true : false;
          allNonMetricFields = _.filter(indexPattern.fields, (f) => {
            return !_.contains(OMIT_FIELDS, f.displayName) &&
            (f.type === KBN_FIELD_TYPES.STRING) &&
            (f.aggregatable === aggregatableCheck);
          });
        } else {
          allNonMetricFields = _.filter(indexPattern.fields, (f) => {
            return (!_.contains(OMIT_FIELDS, f.displayName) && (f.type === $scope.filterFieldType));
          });
        }
      }

      // If a field filter has been entered, perform another filter on the entered regexp.
      if (fieldRegexp !== undefined) {
        allNonMetricFields = _.filter(allNonMetricFields, (f) => {
          return (f.displayName.match(fieldRegexp));
        });
      }

      $scope.totalNonMetricFieldCount = allNonMetricFields.length;

      // Obtain the list of all non-metric fields which appear in documents
      // (aggregatable or not aggregatable).
      const populatedNonMetricFields = [];    // Kibana index pattern non metric fields.
      let nonMetricFieldData = [];            // Basic non metric field data loaded from requesting overall stats.
      let populatedNonMetricFieldCount = 0;
      _.each(allNonMetricFields, (f) => {
        const checkAggregatableField = _.find($scope.overallStats.aggregatableExistsFields, { fieldName: f.displayName });
        if (checkAggregatableField !== undefined) {
          populatedNonMetricFields.push(f);
          nonMetricFieldData.push(checkAggregatableField);
          populatedNonMetricFieldCount++;
        } else {
          const checkNonAggregatableField = _.find($scope.overallStats.nonAggregatableExistsFields, { fieldName: f.displayName });
          if (checkNonAggregatableField !== undefined) {
            populatedNonMetricFields.push(f);
            nonMetricFieldData.push(checkNonAggregatableField);
            populatedNonMetricFieldCount++;
          }
        }
      });

      $scope.populatedNonMetricFieldCount = populatedNonMetricFieldCount;
      if ($scope.totalNonMetricFieldCount === $scope.populatedNonMetricFieldCount) {
        $scope.showAllFields = true;
      }

      const nonMetricFieldsToShow = $scope.showAllFields === true ? allNonMetricFields : populatedNonMetricFields;

      // Combine the field data obtained from Elasticsearch into a single array.
      if ($scope.showAllFields === true) {
        nonMetricFieldData = nonMetricFieldData.concat(
          $scope.overallStats.aggregatableNotExistsFields,
          $scope.overallStats.nonAggregatableNotExistsFields);
      }

      const fieldCards = [];

      _.each(nonMetricFieldsToShow, (field) => {
        const fieldData = _.find(nonMetricFieldData, { fieldName: field.displayName });

        const card = {
          ...fieldData,
          fieldFormat: field.format,
          aggregatable: field.aggregatable,
          scripted: field.scripted,
          loading: fieldData.existsInDocs
        };

        // Map the field type from the Kibana index pattern to the field type
        // used in the data visualizer.
        const dataVisualizerType = kbnTypeToMLJobType(field);
        if (dataVisualizerType !== undefined) {
          card.type = dataVisualizerType;
        } else {
        // Add a flag to indicate that this is one of the 'other' Kibana
        // field types that do not yet have a specific card type.
          card.type = field.type;
          card.isUnsupportedType = true;
        }

        fieldCards.push(card);
      });

      $scope.fieldCards = _.sortBy(fieldCards, 'fieldName');
      loadNonMetricFieldStats();

    }

    function loadMetricFieldStats() {
    // Only request data for fields that exist in documents.
      let numberFields = _.filter($scope.metricCards, { existsInDocs: true });

      // Pass the field name, type and cardinality in the request.
      // Top values will be obtained on a sample if cardinality > 100000.
      numberFields = _.map(numberFields, (card) => {
        const props = { fieldName: card.fieldName, type: card.type };
        if (_.has(card, ['stats', 'cardinality'])) {
          props.cardinality = card.stats.cardinality;
        }
        return props;
      });

      // Obtain the interval to use for date histogram aggregations
      // (such as the document count chart). Aim for 75 bars.
      const buckets = new MlTimeBuckets();
      const bounds = timefilter.getActiveBounds();
      const BAR_TARGET = 75;
      buckets.setInterval('auto');
      buckets.setBounds(bounds);
      buckets.setBarTarget(BAR_TARGET);
      const aggInterval = buckets.getInterval();

      ml.getVisualizerFieldStats({
        indexPatternTitle: indexPattern.title,
        query: $scope.searchQuery,
        timeFieldName: indexPattern.timeFieldName,
        earliest: $scope.earliest,
        latest: $scope.latest,
        samplerShardSize: $scope.samplerShardSize,
        interval: aggInterval.expression,
        fields: numberFields
      })
        .then((resp) => {
          // Add the metric stats to the existing stats in the corresponding card. [ {documentCounts:...}, {fieldName: ..} ]
          _.each($scope.metricCards, (card) => {
            if (card.fieldName !== undefined) {
              card.stats = { ...card.stats, ...(_.find(resp, { fieldName: card.fieldName })) };
            } else {
              // Document count card.
              card.stats = _.find(resp, (stats) => {
                return stats.fieldName === undefined;
              });
            }

            card.loading = false;
          });

          // Clear the filter spinner if it's running.
          $scope.metricFilterIcon = 0;
        })
        .catch((err) => {
          // TODO - display error in cards saying data could not be loaded.
          console.log('DataVisualizer - error getting stats for metric cards from elasticsearch:', err);
          if (err.statusCode === 500) {
            notify.error(
              i18n('xpack.ml.datavisualizer.metricInternalServerErrorTitle', {
                defaultMessage: 'Error loading data for metrics in index {index}. {message}. ' +
                  'The request may have timed out. Try using a smaller sample size or narrowing the time range.',
                values: {
                  index: indexPattern.title,
                  message: err.message,
                }
              }),
              { lifetime: 30000 }
            );
          } else {
            notify.error(
              i18n('xpack.ml.datavisualizer.loadingMetricDataErrorTitle', {
                defaultMessage: 'Error loading data for metrics in index {index}. {message}',
                values: {
                  index: indexPattern.title,
                  message: err.message,
                }
              }),
              { lifetime: 30000 }
            );
          }
        })
        .then(() => {
          $scope.$applyAsync();
        });

    }

    function loadNonMetricFieldStats() {
      // Only request data for fields that exist in documents.
      let fields = _.filter($scope.fieldCards, { existsInDocs: true });

      // Pass the field name, type and cardinality in the request.
      // Top values will be obtained on a sample if cardinality > 100000.
      fields = _.map(fields, (card) => {
        const props = { fieldName: card.fieldName, type: card.type };
        if (_.has(card, ['stats', 'cardinality'])) {
          props.cardinality = card.stats.cardinality;
        }
        return props;
      });

      if (fields.length > 0) {

        ml.getVisualizerFieldStats({
          indexPatternTitle: indexPattern.title,
          query: $scope.searchQuery,
          fields: fields,
          timeFieldName: indexPattern.timeFieldName,
          earliest: $scope.earliest,
          latest: $scope.latest,
          samplerShardSize: $scope.samplerShardSize,
          maxExamples: 10
        })
          .then((resp) => {
            // Add the metric stats to the existing stats in the corresponding card.
            _.each($scope.fieldCards, (card) => {
              card.stats = { ...card.stats, ...(_.find(resp, { fieldName: card.fieldName })) };
              card.loading = false;
            });

            // Clear the filter spinner if it's running.
            $scope.fieldFilterIcon = 0;
          })
          .catch((err) => {
            // TODO - display error in cards saying data could not be loaded.
            console.log('DataVisualizer - error getting non metric field stats from elasticsearch:', err);
            if (err.statusCode === 500) {
              notify.error(
                i18n('xpack.ml.datavisualizer.fieldsInternalServerErrorTitle', {
                  defaultMessage: 'Error loading data for fields in index {index}. {message}. ' +
                    'The request may have timed out. Try using a smaller sample size or narrowing the time range.',
                  values: {
                    index: indexPattern.title,
                    message: err.message,
                  }
                }),
                { lifetime: 30000 }
              );
            } else {
              notify.error(
                i18n('xpack.ml.datavisualizer.loadingFieldsDataErrorTitle', {
                  defaultMessage: 'Error loading data for fields in index {index}. {message}',
                  values: {
                    index: indexPattern.title,
                    message: err.message,
                  }
                }),
                { lifetime: 30000 }
              );
            }
          })
          .then(() => {
            $scope.$applyAsync();
          });
      } else {
        $scope.fieldFilterIcon = 0;
      }
    }

    function loadOverallStats() {
      const aggregatableFields = [];
      const nonAggregatableFields = [];
      _.each(indexPattern.fields, (field) => {
        if (OMIT_FIELDS.indexOf(field.displayName) === -1) {
          if (field.aggregatable === true) {
            aggregatableFields.push(field.displayName);
          } else {
            nonAggregatableFields.push(field.displayName);
          }
        }
      });

      // Need to find:
      // 1. List of aggregatable fields that do exist in docs
      // 2. List of aggregatable fields that do not exist in docs
      // 3. List of non-aggregatable fields that do exist in docs.
      // 4. List of non-aggregatable fields that do not exist in docs.
      ml.getVisualizerOverallStats({
        indexPatternTitle: indexPattern.title,
        query: $scope.searchQuery,
        timeFieldName: indexPattern.timeFieldName,
        samplerShardSize: $scope.samplerShardSize,
        earliest: $scope.earliest,
        latest: $scope.latest,
        aggregatableFields: aggregatableFields,
        nonAggregatableFields: nonAggregatableFields
      })
        .then((resp) => {
          $scope.overallStats = resp;
          createMetricCards();
          createNonMetricCards();
        })
        .catch((err) => {
          // TODO - display error in cards saying data could not be loaded.
          console.log('DataVisualizer - error getting overall stats from elasticsearch:', err);
          if (err.statusCode === 500) {
            notify.error(
              i18n('xpack.ml.datavisualizer.overallFieldsInternalServerErrorTitle', {
                defaultMessage: 'Error loading data for fields in index {index}. {message}. ' +
                  'The request may have timed out. Try using a smaller sample size or narrowing the time range.',
                values: {
                  index: indexPattern.title,
                  message: err.message,
                }
              }),
              { lifetime: 30000 }
            );
          } else {
            notify.error(
              i18n('xpack.ml.datavisualizer.loadingOverallFieldsDataErrorTitle', {
                defaultMessage: 'Error loading data for fields in index {index}. {message}',
                values: {
                  index: indexPattern.title,
                  message: err.message,
                }
              }),
              { lifetime: 30000 }
            );
          }

          $scope.$applyAsync();

        });

    }

    loadOverallStats();

  });
