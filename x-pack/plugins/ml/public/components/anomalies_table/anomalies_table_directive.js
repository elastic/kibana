/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering a table of Machine Learning anomalies.
 */

import moment from 'moment';
import _ from 'lodash';
import rison from 'rison-node';

import { notify } from 'ui/notify';
import { ES_FIELD_TYPES } from 'plugins/ml/../common/constants/field_types';
import { parseInterval } from 'plugins/ml/../common/util/parse_interval';
import { getUrlForRecord } from 'plugins/ml/util/custom_url_utils';
import { replaceStringTokens, mlEscape } from 'plugins/ml/util/string_utils';
import { isTimeSeriesViewDetector } from 'plugins/ml/../common/util/job_utils';
import {
  getEntityFieldName,
  getEntityFieldValue,
  showActualForFunction,
  showTypicalForFunction,
  getSeverity
} from 'plugins/ml/util/anomaly_utils';
import template from './anomalies_table.html';

import 'plugins/ml/components/controls';
import 'plugins/ml/components/paginated_table';
import 'plugins/ml/filters/format_value';
import 'plugins/ml/filters/metric_change_description';
import 'plugins/ml/services/job_service';
import 'plugins/ml/services/mapping_service';
import './expanded_row/expanded_row_directive';
import './influencers_cell/influencers_cell_directive';

import linkControlsHtml from './anomalies_table_links.html';
import chrome from 'ui/chrome';
import openRowArrow from 'plugins/ml/components/paginated_table/open.html';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlAnomaliesTable', function (
  $window,
  $route,
  timefilter,
  mlJobService,
  mlESMappingService,
  mlResultsService,
  mlAnomaliesTableService,
  mlSelectIntervalService,
  mlSelectSeverityService,
  mlFieldFormatService,
  formatValueFilter) {

  return {
    restrict: 'E',
    scope: {
      anomalyRecords: '=',
      timeFieldName: '=',
      showViewSeriesLink: '=',
      filteringEnabled: '='
    },
    template,
    link: function (scope, element) {
      // Previously, we instantiated a new AppState here for the
      // severity threshold and interval setting, thus resetting it on every
      // reload. Now that this is handled differently via services and them
      // being singletons, we need to explicitly reset the setting's state,
      // otherwise the state would be retained across multiple instances of
      // these settings. Should we want to change this behavior, e.g. to
      // store the setting of the severity threshold across pages, we can
      // just remove these resets.
      mlSelectIntervalService.state.reset().changed();
      mlSelectSeverityService.state.reset().changed();

      scope.momentInterval = 'second';

      scope.table = {};
      scope.table.perPage = 25;
      scope.table.columns = [];
      scope.table.rows = [];
      scope.rowScopes = [];

      scope.influencersLimit = 5;

      scope.categoryExamplesByJob = {};
      const MAX_NUMBER_CATEGORY_EXAMPLES = 10;  // Max number of examples to show in table cell or expanded row (engine default is to store 4).

      mlSelectIntervalService.state.watch(updateTableData);
      mlSelectSeverityService.state.watch(updateTableData);

      scope.$watchCollection('anomalyRecords', updateTableData);

      element.on('$destroy', () => {
        mlSelectIntervalService.state.unwatch(updateTableData);
        mlSelectSeverityService.state.unwatch(updateTableData);
        scope.$destroy();
      });

      scope.isShowingAggregatedData = function () {
        const interval = mlSelectIntervalService.state.get('interval');
        return (interval.display !== 'Show all');
      };

      scope.getExamplesForCategory = function (jobId, categoryId) {
        return _.get(scope.categoryExamplesByJob, [jobId, categoryId], []);
      };

      scope.viewSeries = function (record) {
        const bounds = timefilter.getActiveBounds();
        const from = bounds.min.toISOString();    // e.g. 2016-02-08T16:00:00.000Z
        const to = bounds.max.toISOString();

        // Zoom to show 50 buckets either side of the record.
        const recordTime = moment(record[scope.timeFieldName]);
        const zoomFrom = recordTime.subtract(50 * record.bucket_span, 's').toISOString();
        const zoomTo = recordTime.add(100 * record.bucket_span, 's').toISOString();

        // Extract the by, over and partition fields for the record.
        const entityCondition = {};

        if (_.has(record, 'partition_field_value')) {
          entityCondition[record.partition_field_name] = record.partition_field_value;
        }

        if (_.has(record, 'over_field_value')) {
          entityCondition[record.over_field_name] = record.over_field_value;
        }

        if (_.has(record, 'by_field_value')) {
          // Note that analyses with by and over fields, will have a top-level by_field_name,
          // but the by_field_value(s) will be in the nested causes array.
          // TODO - drilldown from cause in expanded row only?
          entityCondition[record.by_field_name] = record.by_field_value;
        }

        // Use rison to build the URL .
        const _g = rison.encode({
          ml: {
            jobIds: [record.job_id]
          },
          refreshInterval: {
            display: 'Off',
            pause: false,
            value: 0
          },
          time: {
            from: from,
            to: to,
            mode: 'absolute'
          }
        });

        const _a = rison.encode({
          mlTimeSeriesExplorer: {
            zoom: {
              from: zoomFrom,
              to: zoomTo
            },
            detectorIndex: record.detector_index,
            entities: entityCondition,
          },
          filters: [],
          query: {
            query_string: {
              analyze_wildcard: true,
              query: '*'
            }
          }
        });

        // Need to encode the _a parameter in case any entities contain unsafe characters such as '+'.
        let path = chrome.getBasePath();
        path += '/app/ml#/timeseriesexplorer';
        path += '?_g=' + _g;
        path += '&_a=' + encodeURIComponent(_a);
        $window.open(path, '_blank');
      };

      scope.viewExamples = function (record) {
        const categoryId = getEntityFieldValue(record);
        const job = mlJobService.getJob(record.job_id);
        const categorizationFieldName = job.analysis_config.categorization_field_name;
        const datafeedIndices = job.datafeed_config.indices;
        // Find the type of the categorization field i.e. text (preferred) or keyword.
        // Uses the first matching field found in the list of indices in the datafeed_config.
        // attempt to load the field type using each index. we have to do it this way as _field_caps
        // doesn't specify which index a field came from unless there is a clash.
        let i = 0;
        findFieldType(datafeedIndices[i]);

        function findFieldType(index) {
          mlESMappingService.getFieldTypeFromMapping(index, categorizationFieldName)
            .then((resp) => {
              if (resp !== '') {
                createAndOpenUrl(index, resp);
              } else {
                i++;
                if (i < datafeedIndices.length) {
                  findFieldType(datafeedIndices[i]);
                } else {
                  error();
                }
              }
            })
            .catch(() => {
              error();
            });
        }

        function createAndOpenUrl(index, categorizationFieldType) {
          // Find the ID of the index pattern with a title attribute which matches the
          // index configured in the datafeed. If a Kibana index pattern has not been created
          // for this index, then the user will see a warning message on the Discover tab advising
          // them that no matching index pattern has been configured.
          const indexPatterns = $route.current.locals.indexPatterns;
          let indexPatternId = index;
          for (let j = 0; j < indexPatterns.length; j++) {
            if (indexPatterns[j].get('title') === index) {
              indexPatternId = indexPatterns[j].id;
              break;
            }
          }

          // Get the definition of the category and use the terms or regex to view the
          // matching events in the Kibana Discover tab depending on whether the
          // categorization field is of mapping type text (preferred) or keyword.
          mlResultsService.getCategoryDefinition(record.job_id, categoryId)
            .then((resp) => {
              let query = null;
              // Build query using categorization regex (if keyword type) or terms (if text type).
              // Check for terms or regex in case categoryId represents an anomaly from the absence of the
              // categorization field in documents (usually indicated by a categoryId of -1).
              if (categorizationFieldType === ES_FIELD_TYPES.KEYWORD) {
                if (resp.regex) {
                  query = `${categorizationFieldName}:/${resp.regex}/`;
                }
              } else {
                if (resp.terms) {
                  query = `${categorizationFieldName}:` + resp.terms.split(' ').join(` AND ${categorizationFieldName}:`);
                }
              }

              const recordTime = moment(record[scope.timeFieldName]);
              const from = recordTime.toISOString();
              const to = recordTime.add(record.bucket_span, 's').toISOString();

              // Use rison to build the URL .
              const _g = rison.encode({
                refreshInterval: {
                  display: 'Off',
                  pause: false,
                  value: 0
                },
                time: {
                  from: from,
                  to: to,
                  mode: 'absolute'
                }
              });

              const appStateProps = {
                index: indexPatternId,
                filters: []
              };
              if (query !== null) {
                appStateProps.query = {
                  query_string: {
                    analyze_wildcard: true,
                    query: query
                  }
                };
              }
              const _a = rison.encode(appStateProps);

              // Need to encode the _a parameter as it will contain characters such as '+' if using the regex.
              let path = chrome.getBasePath();
              path += '/app/kibana#/discover';
              path += '?_g=' + _g;
              path += '&_a=' + encodeURIComponent(_a);
              $window.open(path, '_blank');

            }).catch((resp) => {
              console.log('viewExamples(): error loading categoryDefinition:', resp);
            });

        }

        function error() {
          console.log(`viewExamples(): error finding type of field ${categorizationFieldName} in indices:`,
            datafeedIndices);
          notify.error(`Unable to view examples of documents with mlcategory ${categoryId} ` +
          `as no mapping could be found for the categorization field ${categorizationFieldName}`,
          { lifetime: 30000 });
        }
      };

      scope.openCustomUrl = function (customUrl, record) {
        console.log('Anomalies Table - open customUrl for record:', customUrl, record);

        // If url_value contains $earliest$ and $latest$ tokens, add in times to the source record.
        const timestamp = record[scope.timeFieldName];
        const configuredUrlValue = customUrl.url_value;
        const timeRangeInterval = parseInterval(customUrl.time_range);
        if (configuredUrlValue.includes('$earliest$')) {
          let earliestMoment = moment(timestamp);
          if (timeRangeInterval !== null) {
            earliestMoment.subtract(timeRangeInterval);
          } else {
            earliestMoment = moment(timestamp).startOf(scope.momentInterval);
            if (scope.momentInterval === 'hour') {
              // Start from the previous hour.
              earliestMoment.subtract(1, 'h');
            }
          }
          record.earliest = earliestMoment.toISOString();    // e.g. 2016-02-08T16:00:00.000Z
        }

        if (configuredUrlValue.includes('$latest$')) {
          let latestMoment = moment(timestamp).add(record.bucket_span, 's');
          if (timeRangeInterval !== null) {
            latestMoment.add(timeRangeInterval);
          } else {
            if (scope.isShowingAggregatedData()) {
              latestMoment = moment(timestamp).endOf(scope.momentInterval);
              if (scope.momentInterval === 'hour') {
                // Show to the end of the next hour.
                latestMoment.add(1, 'h');       // e.g. 2016-02-08T18:59:59.999Z
              }
            }
          }
          record.latest = latestMoment.toISOString();
        }

        // If url_value contains $mlcategoryterms$ or $mlcategoryregex$, add in the
        // terms and regex for the selected categoryId to the source record.
        if ((configuredUrlValue.includes('$mlcategoryterms$') || configuredUrlValue.includes('$mlcategoryregex$'))
                && _.has(record, 'mlcategory')) {
          const jobId = record.job_id;

          // mlcategory in the source record will be an array
          // - use first value (will only ever be more than one if influenced by category other than by/partition/over).
          const categoryId = record.mlcategory[0];

          mlResultsService.getCategoryDefinition(jobId, categoryId)
            .then((resp) => {
            // Prefix each of the terms with '+' so that the Elasticsearch Query String query
            // run in a drilldown Kibana dashboard has to match on all terms.
              const termsArray = _.map(resp.terms.split(' '), (term) => { return '+' + term; });
              record.mlcategoryterms = termsArray.join(' ');
              record.mlcategoryregex = resp.regex;

              // Replace any tokens in the configured url_value with values from the source record,
              // and then open link in a new tab/window.
              const urlPath = replaceStringTokens(customUrl.url_value, record, true);
              $window.open(urlPath, '_blank');

            }).catch((resp) => {
              console.log('openCustomUrl(): error loading categoryDefinition:', resp);
            });

        } else {
          // Replace any tokens in the configured url_value with values from the source record,
          // and then open link in a new tab/window.
          const urlPath = getUrlForRecord(customUrl, record);
          $window.open(urlPath, '_blank');
        }

      };

      scope.filter = function (field, value, operator) {
        mlAnomaliesTableService.filterChange.changed(field, value, operator);
      };

      function updateTableData() {
        let summaryRecords = [];
        if (scope.isShowingAggregatedData()) {
          // Aggregate the anomaly data by time and detector, and entity (by/over).
          summaryRecords = aggregateAnomalies();
        } else {
          // Show all anomaly records.
          const interval = mlSelectIntervalService.state.get('interval');
          scope.momentInterval = interval.val;
          const threshold = mlSelectSeverityService.state.get('threshold');
          const filteredRecords = _.filter(scope.anomalyRecords, (record) => {
            return Number(record.record_score) >= threshold.val;
          });

          _.each(filteredRecords, (record) => {
            const detectorIndex = record.detector_index;
            const jobId = record.job_id;
            let detector = record.function_description;
            if ((_.has(mlJobService.detectorsByJob, jobId)) && (detectorIndex < mlJobService.detectorsByJob[jobId].length)) {
              detector = mlJobService.detectorsByJob[jobId][detectorIndex].detector_description;
            }

            const displayRecord = {
              'time': record[scope.timeFieldName],
              'max severity': record.record_score,
              'detector': detector,
              'jobId': jobId,
              'source': record
            };

            const entityName = getEntityFieldName(record);
            if (entityName !== undefined) {
              displayRecord.entityName = entityName;
              displayRecord.entityValue = getEntityFieldValue(record);
            }

            if (_.has(record, 'partition_field_name')) {
              displayRecord.partitionFieldName = record.partition_field_name;
              displayRecord.partitionFieldValue = record.partition_field_value;
            }

            if (_.has(record, 'influencers')) {
              const influencers = [];
              const sourceInfluencers = _.sortBy(record.influencers, 'influencer_field_name');
              _.each(sourceInfluencers, (influencer) => {
                const influencerFieldName = influencer.influencer_field_name;
                _.each(influencer.influencer_field_values, (influencerFieldValue) => {
                  const influencerToAdd = {};
                  influencerToAdd[influencerFieldName] = influencerFieldValue;
                  influencers.push(influencerToAdd);
                });
              });
              displayRecord.influencers = influencers;
            }

            const functionDescription = _.get(record, 'function_description', '');
            if (showActualForFunction(functionDescription) === true) {
              if (_.has(record, 'actual')) {
                displayRecord.actual = record.actual;
              } else {
                // If only a single cause, copy values to the top level.
                if (_.get(record, 'causes', []).length === 1) {
                  const cause = _.first(record.causes);
                  displayRecord.actual = cause.actual;
                }
              }
            }
            if (showTypicalForFunction(functionDescription) === true) {
              if (_.has(record, 'typical')) {
                displayRecord.typical = record.typical;
              } else {
                // If only a single cause, copy values to the top level.
                if (_.get(record, 'causes', []).length === 1) {
                  const cause = _.first(record.causes);
                  displayRecord.typical = cause.typical;
                }
              }
            }

            if (_.has(mlJobService.customUrlsByJob, jobId)) {
              displayRecord.customUrls = mlJobService.customUrlsByJob[jobId];
            }

            summaryRecords.push(displayRecord);

          });
        }

        _.invoke(scope.rowScopes, '$destroy');
        scope.rowScopes.length = 0;

        const showExamples = _.some(summaryRecords, { 'entityName': 'mlcategory' });
        if (showExamples) {
          // Obtain the list of categoryIds by jobId for which we need to obtain the examples.
          // Note category examples will not be displayed if mlcategory is used just an
          // influencer or as a partition field in a config with other by/over fields.
          const categoryRecords = _.where(summaryRecords, { entityName: 'mlcategory' });
          const categoryIdsByJobId = {};
          _.each(categoryRecords, (record) => {
            if (!_.has(categoryIdsByJobId, record.jobId)) {
              categoryIdsByJobId[record.jobId] = [];
            }
            categoryIdsByJobId[record.jobId].push(record.entityValue);
          });
          loadCategoryExamples(categoryIdsByJobId);
        } else {
          scope.categoryExamplesByJob = {};
        }

        // Only show columns in the table which exist in the results.
        scope.table.columns = getPaginatedTableColumns(summaryRecords);

        // Sort by severity by default.
        summaryRecords = (_.sortBy(summaryRecords, 'max severity')).reverse();
        scope.table.rows = summaryRecords.map((record) => {
          return createTableRow(record);
        });

      }

      function aggregateAnomalies() {
        // Aggregate the anomaly data by time, detector, and entity (by/over/partition).
        // TODO - do we want to aggregate by job too, in cases where different jobs
        // have detectors with the same description.
        console.log('aggregateAnomalies(): number of anomalies to aggregate:', scope.anomalyRecords.length);

        if (scope.anomalyRecords.length === 0) {
          return [];
        }

        // Determine the aggregation interval - records in scope are in descending time order.
        const interval = mlSelectIntervalService.state.get('interval');
        if (interval.val === 'auto') {
          const earliest = moment(_.last(scope.anomalyRecords)[scope.timeFieldName]);
          const latest = moment(_.first(scope.anomalyRecords)[scope.timeFieldName]);
          const daysDiff = latest.diff(earliest, 'days');
          scope.momentInterval = (daysDiff < 2 ? 'hour' : 'day');
        } else {
          scope.momentInterval = interval.val;
        }

        // Only show records passing the severity threshold.
        const threshold = mlSelectSeverityService.state.get('threshold');
        const filteredRecords = _.filter(scope.anomalyRecords, (record) => {

          return Number(record.record_score) >= threshold.val;
        });

        const aggregatedData = {};
        _.each(filteredRecords, (record) => {

          // Use moment.js to get start of interval. This will use browser timezone.
          // TODO - support choice of browser or UTC timezone once functionality is in Kibana.
          const roundedTime = moment(record[scope.timeFieldName]).startOf(scope.momentInterval).valueOf();
          if (!_.has(aggregatedData, roundedTime)) {
            aggregatedData[roundedTime] = {};
          }

          // Aggregate by detector - default to functionDescription if no description available.
          const detectorIndex = record.detector_index;
          const jobId = record.job_id;
          let detector = record.function_description;
          if ((_.has(mlJobService.detectorsByJob, jobId)) && (detectorIndex < mlJobService.detectorsByJob[jobId].length)) {
            detector = mlJobService.detectorsByJob[jobId][detectorIndex].detector_description;
          }
          const detectorsAtTime = aggregatedData[roundedTime];
          if (!_.has(detectorsAtTime, detector)) {
            detectorsAtTime[detector] = {};
          }

          // Now add an object for the anomaly with the highest anomaly score per entity.
          // For the choice of entity, look in order for byField, overField, partitionField.
          // If no by/over/partition, default to an empty String.
          const entitiesForDetector = detectorsAtTime[detector];

          // TODO - are we worried about different byFields having the same
          // value e.g. host=server1 and machine=server1?
          let entity = getEntityFieldValue(record);
          if (entity === undefined) {
            entity = '';
          }
          if (!_.has(entitiesForDetector, entity)) {
            entitiesForDetector[entity] = record;
          } else {
            const score = record.record_score;
            if (score > entitiesForDetector[entity].record_score) {
              entitiesForDetector[entity] = record;
            }
          }
        });

        console.log('aggregateAnomalies() aggregatedData is:', aggregatedData);

        // Flatten the aggregatedData to give a list of records with the highest score per bucketed time / detector.
        const summaryRecords = [];
        _.each(aggregatedData, (timeDetectors, roundedTime) => {
          _.each(timeDetectors, (entityDetectors, detector) => {
            _.each(entityDetectors, (record, entity) => {
              const displayRecord = {
                'time': +roundedTime,
                'max severity': record.record_score,
                'detector': detector,
                'jobId': record.job_id,
                'source': record
              };

              const entityName = getEntityFieldName(record);
              if (entityName !== undefined) {
                displayRecord.entityName = entityName;
                displayRecord.entityValue = entity;
              }

              if (_.has(record, 'partition_field_name')) {
                displayRecord.partitionFieldName = record.partition_field_name;
                displayRecord.partitionFieldValue = record.partition_field_value;
              }

              if (_.has(record, 'influencers')) {
                const influencers = [];
                const sourceInfluencers = _.sortBy(record.influencers, 'influencer_field_name');
                _.each(sourceInfluencers, (influencer) => {
                  const influencerFieldName = influencer.influencer_field_name;
                  _.each(influencer.influencer_field_values, (influencerFieldValue) => {
                    const influencerToAdd = {};
                    influencerToAdd[influencerFieldName] = influencerFieldValue;
                    influencers.push(influencerToAdd);
                  });
                });
                displayRecord.influencers = influencers;
              }

              // Copy actual and typical values to the top level for display.
              const functionDescription = _.get(record, 'function_description', '');
              if (showActualForFunction(functionDescription) === true) {
                if (_.has(record, 'actual')) {
                  displayRecord.actual = record.actual;
                } else {
                  // If only a single cause, copy value to the top level.
                  if (_.get(record, 'causes', []).length === 1) {
                    const cause = _.first(record.causes);
                    displayRecord.actual = cause.actual;
                  }
                }
              }
              if (showTypicalForFunction(functionDescription) === true) {
                if (_.has(record, 'typical')) {
                  displayRecord.typical = record.typical;
                } else {
                  // If only a single cause, copy value to the top level.
                  if (_.get(record, 'causes', []).length === 1) {
                    const cause = _.first(record.causes);
                    displayRecord.typical = cause.typical;
                  }
                }
              }

              if (_.has(mlJobService.customUrlsByJob, record.job_id)) {
                displayRecord.customUrls = mlJobService.customUrlsByJob[record.job_id];
              }

              summaryRecords.push(displayRecord);

            });
          });
        });

        return summaryRecords;

      }

      function getPaginatedTableColumns(summaryRecords) {
        // Builds the list of columns for use in the paginated table:
        // row expand arrow
        // time
        // max severity
        // detector
        // found for (if by/over/partition)
        // influenced by (if influencers)
        // actual
        // typical
        // description (how actual compares to typical)
        // job_id
        // links (if custom URLs configured or drilldown functionality)
        // category examples (if by mlcategory)
        const paginatedTableColumns = [
          { title: '', sortable: false, class: 'col-expand-arrow' },
          { title: 'time', sortable: true }];

        if (scope.isShowingAggregatedData()) {
          paginatedTableColumns.push({ title: 'max severity', sortable: true });
        } else {
          paginatedTableColumns.push({ title: 'severity', sortable: true });
        }

        paginatedTableColumns.push({ title: 'detector', sortable: true });

        const showEntity = _.some(summaryRecords, 'entityValue');
        const showInfluencers = _.some(summaryRecords, 'influencers');
        const showActual = _.some(summaryRecords, 'actual');
        const showTypical = _.some(summaryRecords, 'typical');
        const showExamples = _.some(summaryRecords, { 'entityName': 'mlcategory' });
        const showLinks = ((scope.showViewSeriesLink === true) &&
          _.some(summaryRecords, (record) => {
            const job = mlJobService.getJob(record.jobId);
            return isTimeSeriesViewDetector(job, record.source.detector_index);
          })) || showExamples === true || _.some(summaryRecords, 'customUrls');

        if (showEntity === true) {
          paginatedTableColumns.push({ title: 'found for', sortable: true });
        }
        if (showInfluencers === true) {
          paginatedTableColumns.push({ title: 'influenced by', sortable: true });
        }
        if (showActual === true) {
          paginatedTableColumns.push({ title: 'actual', sortable: true });
        }
        if (showTypical === true) {
          paginatedTableColumns.push({ title: 'typical', sortable: true });

          // Assume that if we are showing typical, there will be an actual too,
          // so we can add a column to describe how actual compares to typical.
          const nonTimeOfDayOrWeek = _.some(summaryRecords, (record) => {
            const summaryRecFunc = record.source.function;
            return summaryRecFunc !== 'time_of_day' && summaryRecFunc !== 'time_of_week';
          });
          if (nonTimeOfDayOrWeek === true) {
            paginatedTableColumns.push({ title: 'description', sortable: true });
          }
        }
        paginatedTableColumns.push({ title: 'job ID', sortable: true });
        if (showLinks === true) {
          paginatedTableColumns.push({ title: 'links', sortable: false });
        }
        if (showExamples === true) {
          paginatedTableColumns.push({ title: 'category examples', sortable: false });
        }

        return paginatedTableColumns;
      }


      function createTableRow(record) {
        const rowScope = scope.$new();
        rowScope.expandable = true;
        rowScope.expandElement = 'ml-anomalies-table-expanded-row';
        rowScope.record = record;
        rowScope.isShowingAggregatedData = scope.isShowingAggregatedData();

        rowScope.initRow = function () {
          if (_.has(record, 'entityValue') && record.entityName === 'mlcategory') {
            // Obtain the category definition and display the examples in the expanded row.
            mlResultsService.getCategoryDefinition(record.jobId, record.entityValue)
              .then((resp) => {
                rowScope.categoryDefinition = {
                  'examples': _.slice(resp.examples, 0, Math.min(resp.examples.length, MAX_NUMBER_CATEGORY_EXAMPLES)) };
              }).catch((resp) => {
                console.log('Anomalies table createTableRow(): error loading categoryDefinition:', resp);
              });
          }

          rowScope.$broadcast('initRow', record);
        };

        rowScope.mouseenterRow = function () {
          // Publish that a record is being hovered over, so that the corresponding marker
          // in the model plot chart can be highlighted.
          mlAnomaliesTableService.anomalyRecordMouseenter.changed(record);
        };

        rowScope.mouseleaveRow = function () {
          // Publish that a record is no longer being hovered over, so that the corresponding marker in the
          // model plot chart can be unhighlighted.
          mlAnomaliesTableService.anomalyRecordMouseleave.changed(record);
        };

        // Create a table row with the following columns:
        //   row expand arrow
        //   time
        //   max severity
        //   detector
        //   found for (if by/over/partition)
        //   influenced by (if influencers)
        //   actual
        //   typical
        //   description (how actual compares to typical)
        //   job_id
        //   links (if customUrls configured or drilldown to Single Metric)
        //   category examples (if by mlcategory)
        const addEntity = _.findWhere(scope.table.columns, { 'title': 'found for' });
        const addInfluencers = _.findWhere(scope.table.columns, { 'title': 'influenced by' });

        const addActual = _.findWhere(scope.table.columns, { 'title': 'actual' });
        const addTypical = _.findWhere(scope.table.columns, { 'title': 'typical' });
        const addDescription = _.findWhere(scope.table.columns, { 'title': 'description' });
        const addExamples = _.findWhere(scope.table.columns, { 'title': 'category examples' });
        const addLinks = _.findWhere(scope.table.columns, { 'title': 'links' });
        const fieldFormat = mlFieldFormatService.getFieldFormat(record.jobId, record.source.detector_index);

        const tableRow = [
          {
            markup: openRowArrow,
            scope: rowScope
          },
          {
            markup: formatTimestamp(record.time),
            value: record.time
          },
          {
            markup: parseInt(record['max severity']) >= 1 ?
              '<i class="fa fa-exclamation-triangle ml-icon-severity-' + getSeverity(record['max severity']) +
                '" aria-hidden="true"></i> ' + Math.floor(record['max severity']) :
              '<i class="fa fa-exclamation-triangle ml-icon-severity-' + getSeverity(record['max severity']) +
                '" aria-hidden="true"></i> &lt; 1',
            value: record['max severity']
          },
          {
            markup: mlEscape(record.detector),
            value: record.detector
          }
        ];

        if (addEntity !== undefined) {
          if (_.has(record, 'entityValue')) {
            if (record.entityName !== 'mlcategory') {
              // Escape single quotes and backslash characters in the HTML for the event handlers.
              const safeEntityName = mlEscape(record.entityName.replace(/(['\\])/g, '\\$1'));
              const safeEntityValue = mlEscape(record.entityValue.replace(/(['\\])/g, '\\$1'));

              tableRow.push({
                markup: mlEscape(record.entityValue) +
                  ' <button ng-if="filteringEnabled"' +
                  `ng-click="filter('${safeEntityName}', '${safeEntityValue}', '+')" ` +
                  'tooltip="Add filter" tooltip-append-to-body="1" aria-label="Filter for value">' +
                  '<i class="fa fa-search-plus" aria-hidden="true"></i></button>' +
                  ' <button ng-if="filteringEnabled"' +
                  `ng-click="filter('${safeEntityName}', '${safeEntityValue}', '-')" ` +
                  'tooltip="Remove filter" tooltip-append-to-body="1" aria-label="Remove filter">' +
                  '<i class="fa fa-search-minus" aria-hidden="true"></i></button>',
                value: record.entityValue,
                scope: rowScope
              });
            } else {
              tableRow.push({
                markup: 'mlcategory ' + record.entityValue,
                value: record.entityValue
              });
            }
          } else {
            tableRow.push({
              markup: '',
              value: ''
            });
          }
        }

        if (addInfluencers !== undefined) {
          if (_.has(record, 'influencers')) {
            const cellMarkup = `<ml-influencers-cell influencers="record.influencers" ` +
              `limit="${scope.influencersLimit}"></ml-influencers-cell>`;
            tableRow.push({
              markup: cellMarkup,
              value: cellMarkup,
              scope: rowScope
            });
          } else {
            tableRow.push({
              markup: '',
              value: ''
            });
          }
        }

        if (addActual !== undefined) {
          if (_.has(record, 'actual')) {
            tableRow.push({
              markup: formatValueFilter(record.actual, record.source.function, fieldFormat),
              // Store the unformatted value as a number so that sorting works correctly.
              value: Number(record.actual),
              scope: rowScope });
          } else {
            tableRow.push({ markup: '', value: '' });
          }
        }
        if (addTypical !== undefined) {
          if (_.has(record, 'typical')) {
            const typicalVal = Number(record.typical);
            tableRow.push({
              markup: formatValueFilter(record.typical, record.source.function, fieldFormat),
              value: typicalVal,
              scope: rowScope });

            if (addDescription !== undefined) {
              // Assume there is an actual value if there is a typical,
              // and add a description cell if not time_of_week/day.
              const detectorFunc = record.source.function;
              if (detectorFunc !== 'time_of_week' && detectorFunc !== 'time_of_day') {
                const actualVal = Number(record.actual);
                const factor = (actualVal > typicalVal) ? actualVal / typicalVal : typicalVal / actualVal;
                tableRow.push({
                  markup: `<span ng-bind-html="${actualVal} | metricChangeDescription:${typicalVal}"></span>`,
                  value: Math.abs(factor),
                  scope: rowScope });
              } else {
                tableRow.push({ markup: '', value: '' });
              }
            }
          } else {
            tableRow.push({ markup: '', value: '' });
            if (addDescription !== undefined) {
              tableRow.push({ markup: '', value: '' });
            }
          }
        }

        tableRow.push({ markup: record.jobId, value: record.jobId });

        if (addLinks !== undefined) {
          const job = mlJobService.getJob(record.jobId);
          rowScope.showViewSeriesLink = scope.showViewSeriesLink === true &&
            isTimeSeriesViewDetector(job, record.source.detector_index);
          rowScope.showViewExamplesLink = (_.get(record, 'entityName') === 'mlcategory');
          if (_.has(record, 'customUrls') || rowScope.showViewSeriesLink === true
              || rowScope.showViewExamplesLink) {
            rowScope.customUrls = record.customUrls;
            rowScope.source = record.source;

            tableRow.push({
              markup: linkControlsHtml,
              scope: rowScope
            });
          } else {
            tableRow.push({
              markup: '',
              value: ''
            });
          }
        }

        if (addExamples !== undefined) {
          if (record.entityName === 'mlcategory') {
            tableRow.push({ markup: '<span style="display: block; white-space:nowrap;" ' +
              'ng-repeat="item in getExamplesForCategory(record.jobId, record.entityValue)">{{item}}</span>', scope: rowScope });
          } else {
            tableRow.push({ markup: '', value: '' });
          }
        }

        scope.rowScopes.push(rowScope);

        return tableRow;

      }

      function loadCategoryExamples(categoryIdsByJobId) {
        // Load the example events for the specified map of job_ids and categoryIds from Elasticsearch.
        scope.categoryExamplesByJob = {};
        _.each(categoryIdsByJobId, (categoryIds, jobId) => {
          mlResultsService.getCategoryExamples(jobId, categoryIds, MAX_NUMBER_CATEGORY_EXAMPLES)
            .then((resp) => {
              scope.categoryExamplesByJob[jobId] = resp.examplesByCategoryId;
            }).catch((resp) => {
              console.log('Anomalies table - error getting category examples:', resp);
            });
        });
      }

      function formatTimestamp(epochMs) {
        const time = moment(epochMs);
        if (scope.momentInterval === 'hour') {
          return time.format('MMMM Do YYYY, HH:mm');
        } else if (scope.momentInterval === 'second') {
          return time.format('MMMM Do YYYY, HH:mm:ss');
        } else {
          return time.format('MMMM Do YYYY');
        }
      }

    }
  };
});
