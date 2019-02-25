/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, isEmpty, memoize } from 'lodash';
import chrome from 'ui/chrome';
import { callApi } from './callApi';

export interface ISavedObject {
  attributes: {
    title: string;
  };
  id: string;
  type: string;
}

interface ISavedObjectAPIResponse {
  saved_objects: ISavedObject[];
}

export const getAPMIndexPattern = memoize(async () => {
  const apmIndexPatternTitle: string = chrome.getInjected(
    'apmIndexPatternTitle'
  );
  const res = await callApi<ISavedObjectAPIResponse>({
    pathname: `/api/saved_objects/_find`,
    query: {
      type: 'index-pattern',
      search: `"${apmIndexPatternTitle}"`,
      search_fields: 'title',
      per_page: 200
    }
  });

  if (isEmpty(res.saved_objects)) {
    return;
  }

  const apmSavedObject = first(
    res.saved_objects.filter(
      savedObject => savedObject.attributes.title === apmIndexPatternTitle
    )
  );

  return apmSavedObject;
});
