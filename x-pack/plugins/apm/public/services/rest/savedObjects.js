/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize, isEmpty, first } from 'lodash';
import chrome from 'ui/chrome';
import { getFromSavedObject } from 'ui/index_patterns/static_utils';
import { callApi } from './callApi';

export const getAPMIndexPattern = memoize(async () => {
  const res = await callApi({
    pathname: `/api/saved_objects/_find`,
    query: {
      type: 'index-pattern'
    }
  });

  if (isEmpty(res.savedObjects)) {
    return;
  }

  const apmIndexPattern = chrome.getInjected('apmIndexPattern');
  const apmSavedObject = first(
    res.savedObjects.filter(
      savedObject => savedObject.attributes.title === apmIndexPattern
    )
  );

  if (!apmSavedObject) {
    return;
  }

  return getFromSavedObject(apmSavedObject);
});
