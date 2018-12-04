/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SECTIONS, API_STATUS } from '../../constants';
import {
  loadAutoFollowPatterns as loadAutoFollowPatternsRequest,
  getAutoFollowPattern as getAutoFollowPatternRequest,
  saveAutoFollowPattern as saveAutoFollowPatternRequest,
} from '../../services/api';
import routing from '../../services/routing';
import * as t from '../action_types';
import { apiAction } from './api';

const { AUTO_FOLLOW_PATTERN: scope } = SECTIONS;

export const selectAutoFollowPattern = (name) => ({
  type: t.AUTO_FOLLOW_PATTERN_SELECT,
  payload: name
});


export const loadAutoFollowPatterns = (isUpdating = false) =>
  apiAction({
    label: t.AUTO_FOLLOW_PATTERN_LOAD,
    scope,
    status: isUpdating ? API_STATUS.UPDATING : API_STATUS.LOADING,
    handler: async () => {
      return await loadAutoFollowPatternsRequest();
    },
  });

export const getAutoFollowPattern = (id) =>
  apiAction({
    label: t.AUTO_FOLLOW_PATTERN_GET,
    scope,
    handler: async (dispatch) => (
      getAutoFollowPatternRequest(id)
        .then((response) => {
          dispatch(selectAutoFollowPattern(id));
          return response;
        })
    )
  });

export const saveAutoFollowPattern = (name, autoFollowPattern) => (
  apiAction({
    label: t.AUTO_FOLLOW_PATTERN_CREATE,
    status: API_STATUS.SAVING,
    scope,
    handler: async () => {
      await saveAutoFollowPatternRequest(name, autoFollowPattern);
      routing.navigate('/home');
    }
  })
);
