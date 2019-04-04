/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { apiFetchClusters, apiFetchCluster } from '../../api/api';
import { getEndTime, getStartTime, getActiveClusterUuid } from '../selectors';

export const fetchedClusters = createAction('fetchedClusters', clusters => ({ clusters }));
export const fetchClusters = createThunk('fetchClusters', async ({ dispatch, getState }) => {
  const state = getState();
  const start = getStartTime(state);
  const end = getEndTime(state);

  const parsed = {
    from: datemath.parse(start),
    // roundUp: true is required for the quick select relative date values to work properly
    to: datemath.parse(end, { roundUp: true })
  };

  const timeRange = {};
  if (parsed.from) {
    timeRange.min = parsed.from.toISOString();
  }
  if (parsed.to) {
    timeRange.max = parsed.to.toISOString();
  }

  const clusters = await apiFetchClusters({ timeRange });
  dispatch(fetchedClusters(clusters));
});

export const fetchedCluster = createAction('fetchedCluster', cluster => ({ cluster }));
export const fetchCluster = createThunk('fetchCluster', async ({ dispatch, getState }) => {
  const state = getState();
  const clusterUuid = getActiveClusterUuid(state);
  const start = getStartTime(state);
  const end = getEndTime(state);

  const parsed = {
    from: datemath.parse(start),
    // roundUp: true is required for the quick select relative date values to work properly
    to: datemath.parse(end, { roundUp: true })
  };

  const timeRange = {};
  if (parsed.from) {
    timeRange.min = parsed.from.toISOString();
  }
  if (parsed.to) {
    timeRange.max = parsed.to.toISOString();
  }

  const cluster = await apiFetchCluster(clusterUuid, { timeRange });
  dispatch(fetchedCluster(cluster));
});

export const setActiveClusterUuid = createAction('setActiveClusterUuid', clusterUuid => ({ clusterUuid }));
export const setCcs = createAction('setCcs', ccs => ({ ccs }));

