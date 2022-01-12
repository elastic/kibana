/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, SavedObjectsClientContract } from 'kibana/public';

import { Settings } from '../models/settings';
import { Watch } from '../models/watch';
import { WatchHistoryItem } from '../models/watch_history_item';
import { WatchStatus } from '../models/watch_status';

import { BaseWatch, ExecutedWatchDetails } from '../../../common/types/watch_types';
import { useRequest, sendRequest } from './use_request';

import { ROUTES } from '../../../common/constants';

let httpClient: HttpSetup;

export const setHttpClient = (anHttpClient: HttpSetup) => {
  httpClient = anHttpClient;
};

export const getHttpClient = () => {
  return httpClient;
};

let savedObjectsClient: SavedObjectsClientContract;

export const setSavedObjectsClient = (aSavedObjectsClient: SavedObjectsClientContract) => {
  savedObjectsClient = aSavedObjectsClient;
};

export const getSavedObjectsClient = () => savedObjectsClient;

const basePath = ROUTES.API_ROOT;

const loadWatchesDeserializer = ({ watches = [] }: { watches: any[] }) => {
  return watches.map((watch: any) => Watch.fromUpstreamJson(watch));
};

export const useLoadWatches = (pollIntervalMs: number) => {
  return useRequest({
    path: `${basePath}/watches`,
    method: 'get',
    pollIntervalMs,
    deserializer: loadWatchesDeserializer,
  });
};

const loadWatchDetailDeserializer = ({ watch = {} }: { watch: any }) =>
  Watch.fromUpstreamJson(watch);

export const useLoadWatchDetail = (id: string) => {
  return useRequest({
    path: `${basePath}/watch/${id}`,
    method: 'get',
    deserializer: loadWatchDetailDeserializer,
  });
};

const loadWatchHistoryDeserializer = ({ watchHistoryItems = [] }: { watchHistoryItems: any }) => {
  return watchHistoryItems.map((historyItem: any) =>
    WatchHistoryItem.fromUpstreamJson(historyItem)
  );
};

export const useLoadWatchHistory = (id: string, startTime: string) => {
  return useRequest({
    query: startTime ? { startTime } : undefined,
    path: `${basePath}/watch/${id}/history`,
    method: 'get',
    deserializer: loadWatchHistoryDeserializer,
  });
};

const loadWatchHistoryDetailDeserializer = ({ watchHistoryItem }: { watchHistoryItem: any }) =>
  WatchHistoryItem.fromUpstreamJson(watchHistoryItem);

export const useLoadWatchHistoryDetail = (id: string | undefined) => {
  return useRequest({
    path: !id ? '' : `${basePath}/history/${id}`,
    method: 'get',
    deserializer: loadWatchHistoryDetailDeserializer,
  });
};

export const deleteWatches = async (watchIds: string[]) => {
  const body = JSON.stringify({
    watchIds,
  });
  const { results } = await getHttpClient().post<any>(`${basePath}/watches/delete`, { body });
  return results;
};

export const deactivateWatch = async (id: string) => {
  return sendRequest({
    path: `${basePath}/watch/${id}/deactivate`,
    method: 'put',
  });
};

export const activateWatch = async (id: string) => {
  return sendRequest({
    path: `${basePath}/watch/${id}/activate`,
    method: 'put',
  });
};

export const loadWatch = async (id: string) => {
  const { watch } = await getHttpClient().get<any>(`${basePath}/watch/${id}`);
  return Watch.fromUpstreamJson(watch);
};

export const getMatchingIndices = async (pattern: string) => {
  if (!pattern.startsWith('*')) {
    pattern = `*${pattern}`;
  }
  if (!pattern.endsWith('*')) {
    pattern = `${pattern}*`;
  }
  const body = JSON.stringify({ pattern });
  const { indices } = await getHttpClient().post<any>(`${basePath}/indices`, { body });
  return indices;
};

export const fetchFields = async (indexes: string[]) => {
  const { fields } = await getHttpClient().post<any>(`${basePath}/fields`, {
    body: JSON.stringify({ indexes }),
  });
  return fields;
};

export const createWatch = async (watch: BaseWatch) => {
  return await getHttpClient().put(`${basePath}/watch/${watch.id}`, {
    body: JSON.stringify(watch.upstreamJson),
  });
};

export const executeWatch = async (executeWatchDetails: ExecutedWatchDetails, watch: BaseWatch) => {
  return sendRequest({
    path: `${basePath}/watch/execute`,
    method: 'put',
    body: JSON.stringify({
      executeDetails: executeWatchDetails.upstreamJson,
      watch: watch.upstreamJson,
    }),
  });
};

export const loadIndexPatterns = async () => {
  return sendRequest({
    path: `${basePath}/indices/index_patterns`,
    method: 'get',
  });
};

const getWatchVisualizationDataDeserializer = (data: { visualizeData: any }) => data?.visualizeData;

export const useGetWatchVisualizationData = (watchModel: BaseWatch, visualizeOptions: any) => {
  return useRequest({
    path: `${basePath}/watch/visualize`,
    method: 'post',
    body: JSON.stringify({
      watch: watchModel.upstreamJson,
      options: visualizeOptions.upstreamJson,
    }),
    deserializer: getWatchVisualizationDataDeserializer,
  });
};

const loadSettingsDeserializer = (data: {
  action_types: {
    [key: string]: {
      enabled: boolean;
    };
  };
}) => Settings.fromUpstreamJson(data);

export const useLoadSettings = () => {
  return useRequest({
    path: `${basePath}/settings`,
    method: 'get',
    deserializer: loadSettingsDeserializer,
  });
};

export const ackWatchAction = async (watchId: string, actionId: string) => {
  const { watchStatus } = await getHttpClient().put<any>(
    `${basePath}/watch/${watchId}/action/${actionId}/acknowledge`
  );
  return WatchStatus.fromUpstreamJson(watchStatus);
};
