/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Watch } from 'plugins/watcher/models/watch';
import chrome from 'ui/chrome';
import { ROUTES } from '../../common/constants';
let httpClient: ng.IHttpService;
export const setHttpClient = (anHttpClient: ng.IHttpService) => {
  httpClient = anHttpClient;
};
export const getHttpClient = () => {
  return httpClient;
};
const basePath = chrome.addBasePath(ROUTES.API_ROOT);
export const fetchWatches = async () => {
  const {
    data: { watches },
  } = await getHttpClient().get(`${basePath}/watches`);
  return watches.map(watch => {
    return Watch.fromUpstreamJson(watch);
  });
};
export const deleteWatches = async (watchIds: string[]) => {
  const body = {
    watchIds,
  };
  const {
    data: { results },
  } = await getHttpClient().post(`${basePath}/watches/delete`, body);
  return results;
};
