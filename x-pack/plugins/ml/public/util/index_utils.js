/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { toastNotifications } from 'ui/notify';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

let indexPatternCache = [];
let fullIndexPatterns = [];
let currentIndexPattern = null;
let currentSavedSearch = null;

export let refreshIndexPatterns = null;

export function loadIndexPatterns(Private, indexPatterns) {
  fullIndexPatterns = indexPatterns;
  const savedObjectsClient = Private(SavedObjectsClientProvider);
  return savedObjectsClient.find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000
  }).then((response) => {
    indexPatternCache = response.savedObjects;

    if (refreshIndexPatterns === null) {
      refreshIndexPatterns = () => {
        return new Promise((resolve, reject) => {
          loadIndexPatterns(Private, indexPatterns)
          	.then((resp) => {
              resolve(resp);
            })
            .catch((error) => {
              reject(error);
            });
        });
      };
    }

    return indexPatternCache;
  });
}

export function getIndexPatterns() {
  return indexPatternCache;
}

export function getIndexPatternNames() {
  return indexPatternCache.map(i => (i.attributes && i.attributes.title));
}

export function getIndexPatternIdFromName(name) {
  for (let j = 0; j < indexPatternCache.length; j++) {
    if (indexPatternCache[j].get('title') === name) {
      return indexPatternCache[j].id;
    }
  }
  return name;
}

export function loadCurrentIndexPattern(indexPatterns, $route) {
  fullIndexPatterns = indexPatterns;
  currentIndexPattern = fullIndexPatterns.get($route.current.params.index);
  return currentIndexPattern;
}

export function getIndexPatternById(id) {
  return fullIndexPatterns.get(id);
}

export function loadCurrentSavedSearch($route, savedSearches) {
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
      toastNotifications.addWarning({
        title: `The index pattern ${indexPattern.title} is not based on a time series`,
        text: 'Anomaly detection only runs over time-based indices',
      });
    }
    return false;
  } else {
    return true;
  }
}
