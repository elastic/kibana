/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SECTIONS, API_STATUS } from '../../constants';
import {
  loadFollowerIndices as loadFollowerIndicesRequest,
  getFollowerIndex as getFollowerIndexRequest,
} from '../../services/api';
import * as t from '../action_types';
import { sendApiRequest } from './api';

const { FOLLOWER_INDEX: scope } = SECTIONS;

export const selectDetailFollowerIndex = (id) => ({
  type: t.FOLLOWER_INDEX_SELECT_DETAIL,
  payload: id
});

export const loadFollowerIndices = (isUpdating = false) =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_LOAD,
    scope,
    status: isUpdating ? API_STATUS.UPDATING : API_STATUS.LOADING,
    handler: async () => (
      await loadFollowerIndicesRequest()
    ),
  });

export const getFollowerIndex = (id) =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_GET,
    scope,
    handler: async () => (
      await getFollowerIndexRequest(id)
    )
  });
