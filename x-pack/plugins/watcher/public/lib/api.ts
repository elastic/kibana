/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Settings } from 'plugins/watcher/models/settings';
import { Watch } from 'plugins/watcher/models/watch';
import { WatchHistoryItem } from 'plugins/watcher/models/watch_history_item';
import { WatchStatus } from 'plugins/watcher/models/watch_status';

import { __await } from 'tslib';
import chrome from 'ui/chrome';
import { ROUTES } from '../../common/constants';
import { BaseWatch, ExecutedWatchDetails } from '../../common/types/watch_types';
import { useRequest, sendRequest } from './use_request';

let httpClient: ng.IHttpService;

export const setHttpClient = (anHttpClient: ng.IHttpService) => {
  httpClient = anHttpClient;
};

export const getHttpClient = () => {
  return httpClient;
};

let savedObjectsClient: any;

export const setSavedObjectsClient = (aSavedObjectsClient: any) => {
  savedObjectsClient = aSavedObjectsClient;
};

export const getSavedObjectsClient = () => {
  return savedObjectsClient;
};

const basePath = chrome.addBasePath(ROUTES.API_ROOT);

export const loadWatches = (interval: number) => {
  return useRequest({
    path: `${basePath}/watches`,
    method: 'get',
    interval,
    processData: ({ watches }: { watches: any }) => {
      const watchesArray = watches && watches.length ? watches : [];
      return watchesArray.map((watch: any) => Watch.fromUpstreamJson(watch));
    },
  });
};

export const loadWatchDetail = (id: string) => {
  return useRequest({
    path: `${basePath}/watch/${id}`,
    method: 'get',
    processData: ({ watch }: { watch: any }) => {
      if (watch) {
        return Watch.fromUpstreamJson(watch);
      }
      return {};
    },
  });
};

export const loadWatchHistory = (id: string, startTime: string) => {
  let path = `${basePath}/watch/${id}/history`;

  if (startTime) {
    path += `?startTime=${startTime}`;
  }

  return useRequest({
    path,
    method: 'get',
    processData: ({ watchHistoryItems: items }: { watchHistoryItems: any }) => {
      if (items && items.length) {
        return items.map((historyItem: any) => WatchHistoryItem.fromUpstreamJson(historyItem));
      }
      return [];
    },
  });
};

export const loadWatchHistoryDetail = (id: string | undefined) => {
  return useRequest({
    path: !id ? undefined : `${basePath}/history/${id}`,
    method: 'get',
    processData: ({ watchHistoryItem }: { watchHistoryItem: any }) =>
      WatchHistoryItem.fromUpstreamJson(watchHistoryItem),
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
  return sendRequest({
    path: `${basePath}/watch/execute`,
    method: 'put',
    body: {
      executeDetails: executeWatchDetails.upstreamJson,
      watch: watch.upstreamJson,
    },
  });
};

export const loadIndexPatterns = async () => {
  const { savedObjects } = await getSavedObjectsClient().find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });
  return savedObjects;
};

export const getWatchVisualizationData = (watchModel: BaseWatch, visualizeOptions: any) => {
  return useRequest({
    path: `${basePath}/watch/visualize`,
    method: 'post',
    body: {
      watch: watchModel.upstreamJson,
      options: visualizeOptions.upstreamJson,
    },
    processData: ({ visualizeData }: { visualizeData: any }) => visualizeData,
  });
};

export const loadSettings = () => {
  return useRequest({
    path: `${basePath}/settings`,
    method: 'get',
    processData: (data: {
      actionTypes: {
        [key: string]: {
          enabled: boolean;
        };
      };
    }) => Settings.fromUpstreamJson(data),
  });
};

export const ackWatchAction = async (watchId: string, actionId: string) => {
  const {
    data: { watchStatus },
  } = await getHttpClient().put(
    `${basePath}/watch/${watchId}/action/${actionId}/acknowledge`,
    null
  );
  return WatchStatus.fromUpstreamJson(watchStatus);
};
