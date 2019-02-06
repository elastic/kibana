/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  API_BASE_PATH,
  API_REMOTE_CLUSTERS_BASE_PATH,
  API_INDEX_MANAGEMENT_BASE_PATH,
} from '../../../common/constants';
import { arrify } from '../../../common/services/utils';

const apiPrefix = chrome.addBasePath(API_BASE_PATH);
const apiPrefixRemoteClusters = chrome.addBasePath(API_REMOTE_CLUSTERS_BASE_PATH);
const apiPrefixIndexManagement = chrome.addBasePath(API_INDEX_MANAGEMENT_BASE_PATH);

// This is an Angular service, which is why we use this provider pattern
// to access it within our React app.
let httpClient;

// The deffered AngularJS api allows us to create deferred promise
// to be resolved later. This allows us to cancel in flight Http Requests
// https://docs.angularjs.org/api/ng/service/$q#the-deferred-api
let $q;

export function setHttpClient(client, $deffered) {
  httpClient = client;
  $q = $deffered;
}

// ---

const extractData = (response) => response.data;

/* Auto Follow Pattern */
export const loadAutoFollowPatterns = () => (
  httpClient.get(`${apiPrefix}/auto_follow_patterns`).then(extractData)
);

export const getAutoFollowPattern = (id) => (
  httpClient.get(`${apiPrefix}/auto_follow_patterns/${encodeURIComponent(id)}`).then(extractData)
);

export const loadRemoteClusters = () => (
  httpClient.get(`${apiPrefixRemoteClusters}`).then(extractData)
);

export const createAutoFollowPattern = (autoFollowPattern) => (
  httpClient.post(`${apiPrefix}/auto_follow_patterns`, autoFollowPattern).then(extractData)
);

export const updateAutoFollowPattern = (id, autoFollowPattern) => (
  httpClient.put(`${apiPrefix}/auto_follow_patterns/${encodeURIComponent(id)}`, autoFollowPattern).then(extractData)
);

export const deleteAutoFollowPattern = (id) => {
  const ids = arrify(id).map(_id => encodeURIComponent(_id)).join(',');

  return httpClient.delete(`${apiPrefix}/auto_follow_patterns/${ids}`).then(extractData);
};

/* Follower Index */
export const loadFollowerIndices = () => (
  httpClient.get(`${apiPrefix}/follower_indices`).then(extractData)
);

export const getFollowerIndex = (id) => (
  httpClient.get(`${apiPrefix}/follower_indices/${encodeURIComponent(id)}`).then(extractData)
);

export const createFollowerIndex = (followerIndex) => (
  httpClient.post(`${apiPrefix}/follower_indices`, followerIndex).then(extractData)
);

export const pauseFollowerIndex = (id) => {
  const ids = arrify(id).map(_id => encodeURIComponent(_id)).join(',');
  return httpClient.put(`${apiPrefix}/follower_indices/${ids}/pause`).then(extractData);
};

export const resumeFollowerIndex = (id) => {
  const ids = arrify(id).map(_id => encodeURIComponent(_id)).join(',');
  return httpClient.put(`${apiPrefix}/follower_indices/${ids}/resume`).then(extractData);
};

export const unfollowLeaderIndex = (id) => {
  const ids = arrify(id).map(_id => encodeURIComponent(_id)).join(',');
  return httpClient.put(`${apiPrefix}/follower_indices/${ids}/unfollow`).then(extractData);
};

export const updateFollowerIndex = (id, followerIndex) => (
  httpClient.put(`${apiPrefix}/follower_indices/${encodeURIComponent(id)}`, followerIndex).then(extractData)
);

/* Stats */
export const loadAutoFollowStats = () => (
  httpClient.get(`${apiPrefix}/stats/auto_follow`).then(extractData)
);

/* Indices */
let canceler = null;
export const loadIndices = () => {
  if (canceler) {
    // If there is a previous request in flight we cancel it by resolving the canceler
    canceler.resolve();
  }
  canceler = $q.defer();
  return httpClient.get(`${apiPrefixIndexManagement}/indices`, { timeout: canceler.promise })
    .then((response) => {
      canceler = null;
      return extractData(response);
    });
};

export const loadPermissions = () => (
  httpClient.get(`${apiPrefix}/permissions`).then(extractData)
);
