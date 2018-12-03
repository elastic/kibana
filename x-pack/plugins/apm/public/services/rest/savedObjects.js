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
  const apmIndexPatternTitle = chrome.getInjected('apmIndexPatternTitle');
  const res = await callApi({
    pathname: `/api/saved_objects/_find`,
    query: {
      type: 'index-pattern',
      search: `"${apmIndexPatternTitle}"`,
      search_fields: 'title',
      per_page: 200
    }
  });

  if (isEmpty(res.savedObjects)) {
    return;
  }

  const apmSavedObject = first(
    res.savedObjects.filter(
      savedObject => savedObject.attributes.title === apmIndexPatternTitle
    )
  );

  if (!apmSavedObject) {
    return;
  }

  return getFromSavedObject(apmSavedObject);
});
