/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { notify } from 'ui/notify';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

let indexPatterns = [];
let fullIndexPatterns = [];
let currentIndexPattern = null;
let currentSavedSearch = null;

export function loadIndexPatterns(Private, courier) {
  fullIndexPatterns = courier.indexPatterns;
  const savedObjectsClient = Private(SavedObjectsClientProvider);
  return savedObjectsClient.find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000
  }).then((response) => {
    indexPatterns = response.savedObjects;
    return indexPatterns;
  });
}

export function getIndexPatterns() {
  return indexPatterns;
}

export function getIndexPatternIdFromName(name) {
  for (let j = 0; j < indexPatterns.length; j++) {
    if (indexPatterns[j].get('title') === name) {
      return indexPatterns[j].id;
    }
  }
  return name;
}

export function loadCurrentIndexPattern(courier, $route) {
  fullIndexPatterns = courier.indexPatterns;
  currentIndexPattern = fullIndexPatterns.get($route.current.params.index);
  return currentIndexPattern;
}

export function getIndexPatternById(id) {
  return fullIndexPatterns.get(id);
}

export function loadCurrentSavedSearch(courier, $route, savedSearches) {
  currentSavedSearch = savedSearches.get($route.current.params.savedSearchId);
  return currentSavedSearch;
}

export function getCurrentIndexPattern() {
  return currentIndexPattern;
}

export function getCurrentSavedSearch() {
  return currentSavedSearch;
}

// returns true if the index passed in is time based
// an optional flag will trigger the display a notification at the top of the page
// warning that the index is not time based
export function timeBasedIndexCheck(indexPattern, showNotification = false) {
  if (indexPattern.isTimeBased() === false) {
    if (showNotification) {
      const message = `The index pattern ${indexPattern.title} is not time series based. \
        Anomaly detection can only be run over indices which are time based.`;
      notify.warning(message, { lifetime: 0 });
    }
    return false;
  } else {
    return true;
  }
}
