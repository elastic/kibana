/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import chrome from 'ui/chrome';
import { absoluteToParsedUrl } from 'ui/url/absolute_to_parsed_url';
import { getWindow } from '../../lib/get_window';
import { CANVAS_APP } from '../../../common/lib/constants';

export function trackRouteChange() {
  const basePath = chrome.getBasePath();
  // storage.set(LOCALSTORAGE_LASTPAGE, pathname);
  chrome.trackSubUrlForApp(
    CANVAS_APP,
    absoluteToParsedUrl(get(getWindow(), 'location.href'), basePath)
  );
}
