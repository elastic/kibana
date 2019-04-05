/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Watch } from 'plugins/watcher/models/watch';
import { __await } from 'tslib';
import chrome from 'ui/chrome';
import { ROUTES } from '../../common/constants';
import { BaseWatch, ExecutedWatchDetails } from '../../common/types/watch_types';

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
export const deleteWatches = async (watchIds: string[]) => {
  const body = {
    watchIds,
  };
  const {
    data: { results },
  } = await getHttpClient().post(`${basePath}/watches/delete`, body);
  return results;
};
export const fetchWatch = async (watchId: string) => {
  const body = {
    watchId,
  };
  const {
    data: { results },
  } = await getHttpClient().post(`${basePath}/watches/`, body);
  return results;
};
export const loadWatch = async (id: string) => {
  const { data: watch } = await getHttpClient().get(`${basePath}/watch/${id}`);
  return Watch.fromUpstreamJson(watch.watch);
};
export const getMatchingIndices = async (pattern: string) => {
  if (!pattern.startsWith('*')) {
    pattern = `*${pattern}`;
  }
  if (!pattern.endsWith('*')) {
    pattern = `${pattern}*`;
  }
  const {
    data: { indices },
  } = await getHttpClient().post(`${basePath}/indices`, { pattern });
  return indices;
};
export const fetchFields = async (indexes: string[]) => {
  const {
    data: { fields },
  } = await getHttpClient().post(`${basePath}/fields`, { indexes });
  return fields;
};
export const createWatch = async (watch: BaseWatch) => {
  const { data } = await getHttpClient().put(`${basePath}/watch/${watch.id}`, watch.upstreamJson);
  return data;
};
export const executeWatch = async (executeWatchDetails: ExecutedWatchDetails, watch: BaseWatch) => {
  const { data } = await getHttpClient().put(`${basePath}/watch/execute`, {
    executeDetails: executeWatchDetails.upstreamJson,
    watch: watch.upstreamJson,
  });
  return data;
};
