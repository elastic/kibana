/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  setActiveSourceGroupId,
  setAvailableIndexPatterns,
  setIsIndexPatternsLoading,
  setIsSourceLoading,
  setSource,
} from './actions';
import { SourcererModel, SecurityPageName } from './model';
import { DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
import { getSourceDefaults } from '../../containers/sourcerer';

export type SourcererState = SourcererModel;

export const initialSourcererState: SourcererState = {
  activeSourceGroupId: SecurityPageName.default,
  availableIndexPatterns: [],
  availableSourceGroupIds: [],
  isIndexPatternsLoading: true,
  sourceGroups: {},
};

export const sourceGroupSettings = {
  [SecurityPageName.default]: DEFAULT_INDEX_PATTERN,
  // [SecurityPageName.host]: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
  // [SecurityPageName.detections]: [DEFAULT_SIGNALS_INDEX],
  // [SecurityPageName.timeline]: DEFAULT_INDEX_PATTERN,
  // [SecurityPageName.network]: ['auditbeat-*', 'filebeat-*', 'packetbeat-*'],
};

export const sourcererReducer = reducerWithInitialState(initialSourcererState)
  .case(setActiveSourceGroupId, (state, { payload }) => ({
    ...state,
    activeSourceGroupId: payload,
  }))
  .case(setAvailableIndexPatterns, (state, { payload }) => ({
    ...state,
    availableIndexPatterns: payload,
  }))
  .case(setIsIndexPatternsLoading, (state, { payload }) => ({
    ...state,
    isIndexPatternsLoading: payload,
  }))
  .case(setIsSourceLoading, (state, { id, payload }) => ({
    ...state,
    sourceGroups: {
      ...state.sourceGroups,
      [id]: {
        ...state.sourceGroups[id],
        id,
        loading: payload,
      },
    },
  }))
  .case(setSource, (state, { id, defaultIndex, payload }) => ({
    ...state,
    sourceGroups: {
      ...state.sourceGroups,
      [id]: {
        ...getSourceDefaults(id, defaultIndex),
        ...state.sourceGroups[id],
        ...payload,
      },
    },
    availableSourceGroupIds: state.availableSourceGroupIds.includes(id)
      ? state.availableSourceGroupIds
      : [...state.availableSourceGroupIds, id],
  }))
  .build();
