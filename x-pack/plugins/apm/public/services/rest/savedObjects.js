/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
import chrome from 'ui/chrome';
import { getFromSavedObject } from 'ui/index_patterns/static_utils';
import { callApi } from './callApi';

export const getAPMIndexPattern = memoize(async () => {
  const apmIndexPattern = chrome.getInjected('apmIndexPattern');
  try {
    const res = await callApi({
      pathname: `/api/saved_objects/index-pattern/${apmIndexPattern}`
    });
    return getFromSavedObject(res);
  } catch (error) {
    return;
  }
});
