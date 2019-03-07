/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Watch } from 'plugins/watcher/models/watch';
import { WatchHistoryItem } from 'plugins/watcher/models/watch_history_item';

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
  return watches.map((watch: any) => {
    return Watch.fromUpstreamJson(watch);
  });
};

export const fetchWatchDetail = async (id: string) => {
  const {
    data: { watch },
  } = await getHttpClient().get(`${basePath}/watch/${id}`);
  return Watch.fromUpstreamJson(watch).watchStatus.actionStatuses;
};

export const fetchWatchHistory = async (id: string, startTime: string) => {
  let url = `${basePath}/watch/${id}/history`;
  if (startTime) {
    url += `?startTime=${startTime}`;
  }
  const result: any = await getHttpClient().get(url);
  const items: any = result.data.watchHistoryItems;
  return items.map((historyItem: any) => {
    const item = WatchHistoryItem.fromUpstreamJson(historyItem);
    return item;
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
