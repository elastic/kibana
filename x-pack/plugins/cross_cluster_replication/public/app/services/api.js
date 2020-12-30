/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  API_BASE_PATH,
  API_REMOTE_CLUSTERS_BASE_PATH,
  API_INDEX_MANAGEMENT_BASE_PATH,
} from '../../../common/constants';
import { arrify } from '../../../common/services/utils';
import {
  UIM_FOLLOWER_INDEX_CREATE,
  UIM_FOLLOWER_INDEX_UPDATE,
  UIM_FOLLOWER_INDEX_PAUSE,
  UIM_FOLLOWER_INDEX_PAUSE_MANY,
  UIM_FOLLOWER_INDEX_RESUME,
  UIM_FOLLOWER_INDEX_RESUME_MANY,
  UIM_FOLLOWER_INDEX_UNFOLLOW,
  UIM_FOLLOWER_INDEX_UNFOLLOW_MANY,
  UIM_FOLLOWER_INDEX_USE_ADVANCED_OPTIONS,
  UIM_AUTO_FOLLOW_PATTERN_CREATE,
  UIM_AUTO_FOLLOW_PATTERN_UPDATE,
  UIM_AUTO_FOLLOW_PATTERN_DELETE,
  UIM_AUTO_FOLLOW_PATTERN_DELETE_MANY,
  UIM_AUTO_FOLLOW_PATTERN_PAUSE,
  UIM_AUTO_FOLLOW_PATTERN_PAUSE_MANY,
  UIM_AUTO_FOLLOW_PATTERN_RESUME,
  UIM_AUTO_FOLLOW_PATTERN_RESUME_MANY,
} from '../constants';
import { trackUserRequest } from './track_ui_metric';
import { areAllSettingsDefault } from './follower_index_default_settings';

let httpClient;

export function setHttpClient(client) {
  httpClient = client;
}

export const getHttpClient = () => {
  return httpClient;
};

// ---

const createIdString = (ids) => ids.map((id) => encodeURIComponent(id)).join(',');

/* Auto Follow Pattern */
export const loadAutoFollowPatterns = () => httpClient.get(`${API_BASE_PATH}/auto_follow_patterns`);

export const getAutoFollowPattern = (id) =>
  httpClient.get(`${API_BASE_PATH}/auto_follow_patterns/${encodeURIComponent(id)}`);

export const loadRemoteClusters = () => httpClient.get(API_REMOTE_CLUSTERS_BASE_PATH);

export const createAutoFollowPattern = (autoFollowPattern) => {
  const request = httpClient.post(`${API_BASE_PATH}/auto_follow_patterns`, {
    body: JSON.stringify(autoFollowPattern),
  });
  return trackUserRequest(request, UIM_AUTO_FOLLOW_PATTERN_CREATE);
};

export const updateAutoFollowPattern = (id, autoFollowPattern) => {
  const request = httpClient.put(
    `${API_BASE_PATH}/auto_follow_patterns/${encodeURIComponent(id)}`,
    { body: JSON.stringify(autoFollowPattern) }
  );
  return trackUserRequest(request, UIM_AUTO_FOLLOW_PATTERN_UPDATE);
};

export const deleteAutoFollowPattern = (id) => {
  const ids = arrify(id);
  const idString = ids.map((_id) => encodeURIComponent(_id)).join(',');
  const request = httpClient.delete(`${API_BASE_PATH}/auto_follow_patterns/${idString}`);
  const uiMetric =
    ids.length > 1 ? UIM_AUTO_FOLLOW_PATTERN_DELETE_MANY : UIM_AUTO_FOLLOW_PATTERN_DELETE;
  return trackUserRequest(request, uiMetric);
};

export const pauseAutoFollowPattern = (id) => {
  const ids = arrify(id);
  const idString = ids.map(encodeURIComponent).join(',');
  const request = httpClient.post(`${API_BASE_PATH}/auto_follow_patterns/${idString}/pause`);

  const uiMetric =
    ids.length > 1 ? UIM_AUTO_FOLLOW_PATTERN_PAUSE_MANY : UIM_AUTO_FOLLOW_PATTERN_PAUSE;
  return trackUserRequest(request, uiMetric);
};

export const resumeAutoFollowPattern = (id) => {
  const ids = arrify(id);
  const idString = ids.map(encodeURIComponent).join(',');
  const request = httpClient.post(`${API_BASE_PATH}/auto_follow_patterns/${idString}/resume`);

  const uiMetric =
    ids.length > 1 ? UIM_AUTO_FOLLOW_PATTERN_RESUME_MANY : UIM_AUTO_FOLLOW_PATTERN_RESUME;
  return trackUserRequest(request, uiMetric);
};

/* Follower Index */
export const loadFollowerIndices = () => httpClient.get(`${API_BASE_PATH}/follower_indices`);

export const getFollowerIndex = (id) =>
  httpClient.get(`${API_BASE_PATH}/follower_indices/${encodeURIComponent(id)}`);

export const createFollowerIndex = (followerIndex) => {
  const uiMetrics = [UIM_FOLLOWER_INDEX_CREATE];
  const isUsingAdvancedSettings = !areAllSettingsDefault(followerIndex);
  if (isUsingAdvancedSettings) {
    uiMetrics.push(UIM_FOLLOWER_INDEX_USE_ADVANCED_OPTIONS);
  }
  const request = httpClient.post(`${API_BASE_PATH}/follower_indices`, {
    body: JSON.stringify(followerIndex),
  });
  return trackUserRequest(request, uiMetrics);
};

export const pauseFollowerIndex = (id) => {
  const ids = arrify(id);
  const idString = createIdString(ids);
  const request = httpClient.put(`${API_BASE_PATH}/follower_indices/${idString}/pause`);
  const uiMetric = ids.length > 1 ? UIM_FOLLOWER_INDEX_PAUSE_MANY : UIM_FOLLOWER_INDEX_PAUSE;
  return trackUserRequest(request, uiMetric);
};

export const resumeFollowerIndex = (id) => {
  const ids = arrify(id);
  const idString = createIdString(ids);
  const request = httpClient.put(`${API_BASE_PATH}/follower_indices/${idString}/resume`);
  const uiMetric = ids.length > 1 ? UIM_FOLLOWER_INDEX_RESUME_MANY : UIM_FOLLOWER_INDEX_RESUME;
  return trackUserRequest(request, uiMetric);
};

export const unfollowLeaderIndex = (id) => {
  const ids = arrify(id);
  const idString = createIdString(ids);
  const request = httpClient.put(`${API_BASE_PATH}/follower_indices/${idString}/unfollow`);
  const uiMetric = ids.length > 1 ? UIM_FOLLOWER_INDEX_UNFOLLOW_MANY : UIM_FOLLOWER_INDEX_UNFOLLOW;
  return trackUserRequest(request, uiMetric);
};

export const updateFollowerIndex = (id, followerIndex) => {
  const uiMetrics = [UIM_FOLLOWER_INDEX_UPDATE];
  const isUsingAdvancedSettings = !areAllSettingsDefault(followerIndex);
  if (isUsingAdvancedSettings) {
    uiMetrics.push(UIM_FOLLOWER_INDEX_USE_ADVANCED_OPTIONS);
  }

  const {
    maxReadRequestOperationCount,
    maxOutstandingReadRequests,
    maxReadRequestSize,
    maxWriteRequestOperationCount,
    maxWriteRequestSize,
    maxOutstandingWriteRequests,
    maxWriteBufferCount,
    maxWriteBufferSize,
    maxRetryDelay,
    readPollTimeout,
  } = followerIndex;

  const request = httpClient.put(`${API_BASE_PATH}/follower_indices/${encodeURIComponent(id)}`, {
    body: JSON.stringify({
      maxReadRequestOperationCount,
      maxOutstandingReadRequests,
      maxReadRequestSize,
      maxWriteRequestOperationCount,
      maxWriteRequestSize,
      maxOutstandingWriteRequests,
      maxWriteBufferCount,
      maxWriteBufferSize,
      maxRetryDelay,
      readPollTimeout,
    }),
  });

  return trackUserRequest(request, uiMetrics);
};

/* Stats */
export const loadAutoFollowStats = () => httpClient.get(`${API_BASE_PATH}/stats/auto_follow`);

/* Indices */
let abortController = null;
export const loadIndices = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  abortController = new AbortController();
  const { signal } = abortController;
  return httpClient
    .get(`${API_INDEX_MANAGEMENT_BASE_PATH}/indices`, { signal })
    .then((response) => {
      abortController = null;
      return response;
    });
};

export const loadPermissions = () => httpClient.get(`${API_BASE_PATH}/permissions`);
