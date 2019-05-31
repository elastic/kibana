/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import $ from 'jquery';
import { buildEsQuery, getEsQueryConfig } from '@kbn/es-query';
import { addItemToRecentlyAccessed } from 'plugins/ml/util/recently_accessed';
import { mlJobService } from 'plugins/ml/services/job_service';


// Provider for creating the items used for searching and job creation.
// Uses the $route object to retrieve the indexPattern and savedSearch from the url
export function SearchItemsProvider($route, config) {

  function createSearchItems() {
    let indexPattern = $route.current.locals.indexPattern;

    // query is only used by the data visualizer as it needs
    // a lucene query_string.
    // Using a blank query will cause match_all:{} to be used
    // when passed through luceneStringToDsl
    let query = {
      query: '',
      language: 'lucene'
    };

    let combinedQuery = {
      bool: {
        must: [{
          match_all: {}
        }]
      }
    };

    const savedSearch = $route.current.locals.savedSearch;
    if (indexPattern.id === undefined && savedSearch.id !== undefined) {
      const searchSource = savedSearch.searchSource;
      indexPattern = searchSource.getField('index');

      query = searchSource.getField('query');
      const fs = searchSource.getField('filter');

      const filters = (fs.length) ? fs : [];

      const esQueryConfigs = getEsQueryConfig(config);
      combinedQuery = buildEsQuery(indexPattern, [query], filters, esQueryConfigs);
    }

    return {
      indexPattern,
      savedSearch,
      query,
      combinedQuery,
    };
  }

  return createSearchItems;
}

export function createJobForSaving(job) {
  const newJob = _.cloneDeep(job);
  delete newJob.datafeed_config;
  return newJob;
}

export function addNewJobToRecentlyAccessed(jobId, resultsUrl) {
  const urlParts = resultsUrl.match(/ml#\/(.+?)(\?.+)/);
  addItemToRecentlyAccessed(urlParts[1], jobId, urlParts[2]);
}

export function moveToAdvancedJobCreationProvider($location) {
  return function moveToAdvancedJobCreation(job) {
    mlJobService.currentJob = job;
    $location.path('jobs/new_job/advanced');
  };
}

export function focusOnResultsLink(linkId, $timeout) {
  // Set focus to the View Results button, which also provides
  // accessibility feedback that the job has finished.
  // Run inside $timeout to ensure model has been updated with job state
  $timeout(() => {
    $(`#${linkId}`).focus();
  }, 0);
}

// Only model plot cardinality relevant
// format:[{id:"cardinality_model_plot_high",modelPlotCardinality:11405}, {id:"cardinality_partition_field",fieldName:"clientip"}]
export function checkCardinalitySuccess(data) {
  const response = {
    success: true,
  };
  // There were no fields to run cardinality on.
  if (Array.isArray(data) && data.length === 0) {
    return response;
  }

  for (let i = 0; i < data.length; i++) {
    if (data[i].id === 'success_cardinality') {
      break;
    }

    if (data[i].id === 'cardinality_model_plot_high') {
      response.success = false;
      response.highCardinality = data[i].modelPlotCardinality;
      break;
    }
  }

  return response;
}

// Ensure validation endpoints are given job with expected minimum fields
export function getMinimalValidJob() {
  return {
    analysis_config: {
      bucket_span: '15m',
      detectors: [],
      influencers: []
    },
    data_description: { time_field: '@timestamp' },
    datafeed_config: {
      indices: []
    }
  };
}
