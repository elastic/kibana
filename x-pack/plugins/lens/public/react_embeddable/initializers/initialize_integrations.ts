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
  isOfQueryType,
} from '@kbn/es-query';
import { noop } from 'lodash';
import { emptySerializer } from '../helper';
import type { GetStateType } from '../types';
import type { IntegrationCallbacks } from '../types';

export function initializeIntegrations(getLatestState: GetStateType): {
  api: Omit<IntegrationCallbacks, 'updateState'>;
  cleanup: () => void;
  serialize: () => {};
  comparators: {};
} {
  const isTextBasedLanguage = () => {
    const currentState = getLatestState().attributes;
    return !isOfQueryType(currentState?.state.query);
  };
  return {
    api: {
      // TODO: workout why we have this duplicated
      getFullAttributes: () => getLatestState().attributes,
      getSavedVis: () => getLatestState().attributes,
      isTextBasedLanguage,
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
