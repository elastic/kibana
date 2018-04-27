/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { notify } from 'ui/notify';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

export function getIndexPatterns(Private) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);
  return savedObjectsClient.find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000
  }).then(response => response.savedObjects);
}

export function getIndexPattern(courier, indexPatternId) {
  return courier.indexPatterns.get(indexPatternId);
}

export function getIndexPatternWithRoute(courier, $route) {
  return getIndexPattern(courier, $route.current.params.index);
}

export function getIndexPatternProvider(courier) {
  return function (indexPatternId) {
    return getIndexPattern(courier, indexPatternId);
  };
}

export function getSavedSearchWithRoute(courier, $route, savedSearches) {
  return savedSearches.get($route.current.params.savedSearchId);
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
