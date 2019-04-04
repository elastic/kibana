/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { kfetch } from 'ui/kfetch';

const apiPrefix = chrome.addBasePath('/api/monitoring/v1');
export const apiFetchClusters = async (date) => {
  return await kfetch({
    pathname: `${apiPrefix}/clusters`,
    method: 'POST',
    body: JSON.stringify(date)
  });
};

export const apiFetchCluster = async (clusterUuid, date) => {
  return await kfetch({
    pathname: `${apiPrefix}/clusters/${clusterUuid}`,
    method: 'POST',
    body: JSON.stringify(date)
  });
};
