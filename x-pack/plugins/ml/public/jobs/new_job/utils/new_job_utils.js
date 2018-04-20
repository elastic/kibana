/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import moment from 'moment';
import { migrateFilter } from 'ui/courier/data_source/_migrate_filter.js';
import { addItemToRecentlyAccessed } from 'plugins/ml/util/recently_accessed';

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
    indexPattern = searchSource.get('index');

    // Extract the query from the searchSource
    // Might be as a String in q.query, or
    // nested inside q.query.query_string
    const q = searchSource.get('query');
    if (q !== undefined && q.language === 'lucene' && q.query !== undefined) {
      if (typeof q.query === 'string' && q.query !== '') {
        query.query_string.query = q.query;
      } else if (typeof q.query === 'object' &&
          typeof q.query.query_string === 'object' && q.query.query_string.query !== '') {
        query.query_string.query = q.query.query_string.query;
      }
    }

    const fs = searchSource.get('filter');
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

export function createResultsUrl(jobIds, start, end, resultsPage) {
  const idString = jobIds.map(j => `'${j}'`).join(',');
  const from = moment(start).toISOString();
  const to = moment(end).toISOString();
  let path = '';
  path += 'ml#/';
  path += resultsPage;
  path += `?_g=(ml:(jobIds:!(${idString}))`;
  path += `,refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${from}'`;
  path += `,mode:absolute,to:'${to}'`;
  path += '))&_a=(filters:!(),query:(query_string:(analyze_wildcard:!t,query:\'*\')))';

  return path;
}

export function addNewJobToRecentlyAccessed(jobId, resultsUrl) {
  const urlParts = resultsUrl.match(/ml#\/(.+?)(\?.+)/);
  addItemToRecentlyAccessed(urlParts[1], jobId, urlParts[2]);
}
