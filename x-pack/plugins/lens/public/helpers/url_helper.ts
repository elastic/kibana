/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseUrl, stringify } from 'query-string';
import { DashboardConstants } from '../../../../../src/plugins/dashboard/public';

type UrlVars = Record<string, string>;

/**
 * Return query params from URL
 * @param url given url
 */
export function getUrlVars(url: string): Record<string, string> {
  const vars: UrlVars = {};
  for (const [, key, value] of url.matchAll(/[?&]+([^=&]+)=([^&]*)/gi)) {
    vars[key] = decodeURIComponent(value);
  }
  return vars;
}

/** *
 * Returns dashboard URL with added embeddableType and embeddableId query params
 * eg.
 * input: url: /lol/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now)), embeddableId: 12345
 * output: /lol/app/kibana#/dashboard?addEmbeddableType=lens&addEmbeddableId=12345&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))
 * @param url dasbhoard absolute url
 * @param embeddableId id of the saved visualization
 * @param urlVars url query params
 */
export function addEmbeddableToDashboardUrl(url: string, embeddableId: string, urlVars: UrlVars) {
  const dashboardParsedUrl = parseUrl(url);
  const keys = Object.keys(urlVars).sort();

  keys.forEach(key => {
    dashboardParsedUrl.query[key] = urlVars[key];
  });
  dashboardParsedUrl.query[DashboardConstants.ADD_EMBEDDABLE_TYPE] = 'lens';
  dashboardParsedUrl.query[DashboardConstants.ADD_EMBEDDABLE_ID] = embeddableId;
  const query = stringify(dashboardParsedUrl.query);

  return `${dashboardParsedUrl.url}?${query}`;
}
