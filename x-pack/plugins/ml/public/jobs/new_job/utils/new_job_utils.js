/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import $ from 'jquery';
import { migrateFilter } from 'ui/courier';
import { addItemToRecentlyAccessed } from 'plugins/ml/util/recently_accessed';
import { mlJobService } from 'plugins/ml/services/job_service';

export function getQueryFromSavedSearch(formConfig) {
  const must = [];
  const mustNot = [];

  must.push(formConfig.query);

  formConfig.filters.forEach((f) => {
    let query = (f.query || f);
    query = _.omit(query, ['meta', '$state']);
    query = migrateFilter(query);

    if(f.meta.disabled === false) {
      if(f.meta.negate) {
        mustNot.push(query);
      } else {
        must.push(query);
      }
    }
  });

  return {
    bool: {
      must,
      must_not: mustNot
    }
  };
}

// create items used for searching and job creation.
// takes the $route object to retrieve the indexPattern and savedSearch from the url
export function createSearchItems($route) {
  let indexPattern = $route.current.locals.indexPattern;
  const query = {
    query_string: {
      analyze_wildcard: true,
      query: '*'
    }
  };

  let filters = [];
  const savedSearch = $route.current.locals.savedSearch;
  const searchSource = savedSearch.searchSource;

  if (indexPattern.id === undefined &&
    savedSearch.id !== undefined) {
    indexPattern = searchSource.getField('index');

    // Extract the query from the searchSource
    // Might be as a String in q.query, or
    // nested inside q.query.query_string
    const q = searchSource.getField('query');
    if (q !== undefined && q.language === 'lucene' && q.query !== undefined) {
      if (typeof q.query === 'string' && q.query !== '') {
        query.query_string.query = q.query;
      } else if (typeof q.query === 'object' &&
          typeof q.query.query_string === 'object' && q.query.query_string.query !== '') {
        query.query_string.query = q.query.query_string.query;
      }
    }

    const fs = searchSource.getField('filter');
    if (fs.length) {
      filters = fs;
    }

  }
  const combinedQuery = getQueryFromSavedSearch({ query, filters });

  return {
    indexPattern,
    savedSearch,
    filters,
    query,
    combinedQuery
  };
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
