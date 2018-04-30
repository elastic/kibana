/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * ml-custom-url-editor directive for editing a custom URL link which allows the
 * user to drill through from an anomaly to another URL such as a Kibana dashboard.
 */

import _ from 'lodash';
import rison from 'rison-node';

import template from './custom_url_editor.html';
import 'plugins/ml/components/item_select';
import { parseInterval } from 'plugins/ml/../common/util/parse_interval';
import { escapeForElasticsearchQuery } from 'plugins/ml/util/string_utils';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlCustomUrlEditor', function (Private) {
  return {
    scope: {
      addCustomUrl: '&',
      job: '='
    },
    restrict: 'AE',
    replace: true,
    transclude: true,
    template,
    controller: function ($scope, $q) {
      const URL_TYPE = {
        KIBANA_DASHBOARD: 'KIBANA_DASHBOARD',
        KIBANA_DISCOVER: 'KIBANA_DISCOVER',
        OTHER: 'OTHER'
      };
      $scope.URL_TYPE = URL_TYPE;

      const TIME_RANGE_TYPE = {
        AUTO: 'auto',
        INTERVAL: 'interval'
      };
      $scope.TIME_RANGE_TYPE = TIME_RANGE_TYPE;

      $scope.newCustomUrl = {
        label: undefined,
        type: URL_TYPE.OTHER,
        // Note timeRange is only editable in new URLs for Dashboard and Discover URLs,
        // as for other URLs we have no way of knowing how the field will be used in the URL.
        timeRange: {
          type: TIME_RANGE_TYPE.AUTO
        },
        kibanaSettings: {
          queryFieldNames: []
        },
        otherUrlSettings: {
          urlValue: ''
        }
      };

      $scope.dashboards = [];
      $scope.indexPatterns = [];
      $scope.timeRangeIntervalError = false;

      $scope.updateQueryFieldNames = {};    // External update function for Kibana query field names ml-item-select.

      // Query 1 - load the saved Kibana dashboards.
      const savedObjectsClient = Private(SavedObjectsClientProvider);
      function getSavedDashboards() {
        return savedObjectsClient.find({
          type: 'dashboard',
          fields: ['title'],
          perPage: 1000
        });
      }

      // Query 2 - load the Kibana index patterns.
      function getSavedIndexPatterns() {
        return savedObjectsClient.find({
          type: 'index-pattern',
          fields: ['title'],
          perPage: 1000
        });
      }

      $q.all([
        getSavedDashboards(),
        getSavedIndexPatterns()
      ])
        .then(response => {
          $scope.dashboards = _.chain(response[0])
            .get('savedObjects', [])
            .map(savedObj => ({ id: savedObj.id, title: savedObj.attributes.title }))
            .sortBy(obj => obj.title.toLowerCase())
            .value();

          $scope.indexPatterns = _.chain(response[1])
            .get('savedObjects', [])
            .map(savedObj => ({ id: savedObj.id, title: savedObj.attributes.title }))
            .sortBy(obj => obj.title.toLowerCase())
            .value();

          initFields();
        })
        .catch((resp) => {
          console.log('Custom URL editor - error loading saved dashboards and index patterns', resp);
        });


      // Get the list of partitioning and influencer fields that can be used as
      // entities to add to the query / filter used when linking to a Kibana dashboard.
      const detectors = $scope.job.analysis_config.detectors;
      const jobFieldNames = _.get($scope.job.analysis_config, 'influencers', []);
      _.each(detectors, (detector) => {
        if (_.has(detector, 'partition_field_name')) {
          jobFieldNames.push(detector.partition_field_name);
        }
        if (_.has(detector, 'by_field_name')) {
          jobFieldNames.push(detector.by_field_name);
        }
        if (_.has(detector, 'over_field_name')) {
          jobFieldNames.push(detector.over_field_name);
        }
      });

      // Remove duplicates, sort and get in format for use by the item-select component.
      $scope.jobFieldNames = _.chain(jobFieldNames)
        .uniq()
        .sortBy(fieldName => fieldName.toLowerCase())
        .map(fieldName => ({ id: fieldName }))
        .value();

      $scope.addQueryEntity = function () {
        if ($scope.jobFieldNames.length > 0) {
          $scope.newCustomUrl.kibanaSettings.queryFieldNames.push($scope.jobFieldNames[0]);
        }
      };

      $scope.removeQueryEntity = function (index) {
        $scope.newCustomUrl.kibanaSettings.queryFieldNames.splice(index, 1);
      };

      $scope.timeRangeIntervalChanged = function () {
        const interval = parseInterval($scope.newCustomUrl.timeRange.interval);
        $scope.timeRangeIntervalError = (interval === null);
      };

      $scope.addUrl = function () {
        const settings = $scope.newCustomUrl;

        if (settings.type === URL_TYPE.KIBANA_DASHBOARD) {
          addDashboardUrl();
        } else if (settings.type === URL_TYPE.KIBANA_DISCOVER) {
          addDiscoverUrl();
        } else {
          const urlToAdd = {
            url_name: settings.label,
            url_value: settings.otherUrlSettings.urlValue
          };

          $scope.addCustomUrl()(urlToAdd);

          // Set the fields back to their defaults.
          initFields();
        }

      };

      function addDashboardUrl() {
        const settings = $scope.newCustomUrl;

        // Get the complete list of attributes for the selected dashboard (query, filters).
        savedObjectsClient.get('dashboard', settings.kibanaSettings.dashboardId)
          .then((response) => {
            // Use the filters from the saved dashboard if there are any.
            let filters = [];

            // Use the query from the dashboard only if no job entities are selected.
            let query = undefined;

            const searchSourceJSON = response.get('kibanaSavedObjectMeta.searchSourceJSON');
            if (searchSourceJSON !== undefined) {
              const searchSource = JSON.parse(searchSourceJSON);
              filters = _.get(searchSource, 'filter', []);
              query = searchSource.query;
            }

            // Add time settings to the global state URL parameter with $earliest$ and
            // $latest$ tokens which get substituted for times around the time of the
            // anomaly on which the URL will be run against.
            const _g = rison.encode({
              time: {
                from: '$earliest$',
                to: '$latest$',
                mode: 'absolute'
              }
            });

            const appState = {
              filters
            };

            // To put entities in filters section would involve creating parameters of the form
            // filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b30fd340-efb4-11e7-a600-0f58b1422b87,
            // key:airline,negate:!f,params:(query:AAL,type:phrase),type:phrase,value:AAL),query:(match:(airline:(query:AAL,type:phrase)))))
            // which includes the ID of the index holding the field used in the filter.

            // So for simplicity, put entities in the query, replacing any query which is there already.
            // e.g. query:(language:lucene,query:'region:us-east-1%20AND%20instance:i-20d061fa')
            if (settings.kibanaSettings.queryFieldNames.length > 0) {
              let queryString = '';
              _.each(settings.kibanaSettings.queryFieldNames, (fieldName, index) => {
                if (index > 0) {
                  queryString += ' AND ';
                }
                queryString += `${escapeForElasticsearchQuery(fieldName)}:"$${fieldName}$"`;
              });

              query = {
                language: 'lucene',
                query: queryString
              };
            }

            if (query !== undefined) {
              appState.query = query;
            }

            const _a = rison.encode(appState);

            const urlValue = `kibana#/dashboard/${settings.kibanaSettings.dashboardId}?_g=${_g}&_a=${_a}`;

            const urlToAdd = {
              url_name: settings.label,
              url_value: urlValue,
              time_range: TIME_RANGE_TYPE.AUTO
            };

            if (settings.timeRange.type === TIME_RANGE_TYPE.INTERVAL) {
              urlToAdd.time_range = settings.timeRange.interval;
            }

            $scope.addCustomUrl()(urlToAdd);

            // Set the fields back to their defaults.
            initFields();
          })
          .catch((resp) => {
            console.log('Custom URL editor - error getting details on dashboard', resp);
          });
      }

      function addDiscoverUrl() {
        const settings = $scope.newCustomUrl;

        // Add time settings to the global state URL parameter with $earliest$ and
        // $latest$ tokens which get substituted for times around the time of the
        // anomaly on which the URL will be run against.
        const _g = rison.encode({
          time: {
            from: '$earliest$',
            to: '$latest$',
            mode: 'absolute'
          }
        });

        // Add the index pattern and query to the appState part of the URL.
        const appState = {
          index: settings.kibanaSettings.discoverIndexPatternId
        };

        // Use the query from the datafeed only if no job entities are selected.
        let query = $scope.job.datafeed_config.query;

        // To put entities in filters section would involve creating parameters of the form
        // filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b30fd340-efb4-11e7-a600-0f58b1422b87,
        // key:airline,negate:!f,params:(query:AAL,type:phrase),type:phrase,value:AAL),query:(match:(airline:(query:AAL,type:phrase)))))
        // which includes the ID of the index holding the field used in the filter.

        // So for simplicity, put entities in the query, replacing any query which is there already.
        // e.g. query:(language:lucene,query:'region:us-east-1%20AND%20instance:i-20d061fa')
        if (settings.kibanaSettings.queryFieldNames.length > 0) {
          let queryString = '';
          _.each(settings.kibanaSettings.queryFieldNames, (fieldName, i) => {
            if (i > 0) {
              queryString += ' AND ';
            }
            queryString += `${escapeForElasticsearchQuery(fieldName)}:"$${fieldName}$"`;
          });

          query = {
            language: 'lucene',
            query: queryString
          };
        }

        if (query !== undefined) {
          appState.query = query;
        }

        const _a = rison.encode(appState);

        const urlValue = `kibana#/discover?_g=${_g}&_a=${_a}`;

        const urlToAdd = {
          url_name: settings.label,
          url_value: urlValue
        };

        if (settings.timeRange.type === TIME_RANGE_TYPE.INTERVAL) {
          urlToAdd.time_range = settings.timeRange.interval;
        }

        $scope.addCustomUrl()(urlToAdd);

        initFields();

      }

      function initFields() {
        $scope.newCustomUrl.label = '';
        $scope.newCustomUrl.otherUrlSettings = {
          urlValue: ''
        };
        $scope.newCustomUrl.timeRange = {
          type: TIME_RANGE_TYPE.AUTO
        };

        $scope.newCustomUrl.kibanaSettings = {
          queryFieldNames: []
        };

        // Clear selections from the Entities select control.
        if (typeof $scope.updateQueryFieldNames.update === 'function') {
          $scope.updateQueryFieldNames.update([]);
        }

        if ($scope.dashboards.length > 0) {
          $scope.newCustomUrl.type = URL_TYPE.KIBANA_DASHBOARD;
          $scope.newCustomUrl.kibanaSettings.dashboardId = $scope.dashboards[0].id;
        } else {
          $scope.newCustomUrl.type = $scope.indexPatterns.length > 0 ?
            URL_TYPE.KIBANA_DASHBOARD : URL_TYPE.OTHER;
        }

        if ($scope.indexPatterns.length > 0 &&
          $scope.job.datafeed_config.indices !== undefined &&
          $scope.job.datafeed_config.indices.length > 0) {
          // For the Discover option, set the default index pattern to that
          // which matches the (first) index configured in the job datafeed.
          const datafeedIndex = $scope.job.datafeed_config.indices[0];
          let defaultIndexPattern = _.find($scope.indexPatterns, { title: datafeedIndex });
          if (defaultIndexPattern === undefined) {
            defaultIndexPattern = $scope.indexPatterns[0];
          }

          $scope.newCustomUrl.kibanaSettings.discoverIndexPatternId = defaultIndexPattern.id;
        }

      }

    }
  };
});
