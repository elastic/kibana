/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAggregateQueryMode,
  getLanguageDisplayName,
  isOfAggregateQueryType,
} from '@kbn/es-query';
import { noop } from 'lodash';
import type { HasSerializableState } from '@kbn/presentation-containers';
import { emptySerializer, isTextBasedLanguage } from '../helper';
import type { GetStateType } from '../types';
import type { IntegrationCallbacks } from '../types';

export function initializeIntegrations(getLatestState: GetStateType): {
  api: Omit<
    IntegrationCallbacks,
    | 'updateState'
    | 'updateAttributes'
    | 'updateDataViews'
    | 'updateSavedObjectId'
    | 'updateOverrides'
    | 'updateDataLoading'
  > &
    HasSerializableState;
  cleanup: () => void;
  serialize: () => {};
  comparators: {};
} {
  return {
    api: {
      serializeState: () => ({ rawState: getLatestState(), references: [] }),
      // TODO: workout why we have this duplicated
      getFullAttributes: () => getLatestState().attributes,
      getSavedVis: () => getLatestState().attributes,
      isTextBasedLanguage: () => isTextBasedLanguage(getLatestState()),
      getTextBasedLanguage: () => {
        const query = getLatestState().attributes?.state.query;
        if (!query || !isOfAggregateQueryType(query)) {
          return;
        }
        const language = getAggregateQueryMode(query);
        return getLanguageDisplayName(language).toUpperCase();
      },
    },
    comparators: {},
    serialize: emptySerializer,
    cleanup: noop,
  };
}
