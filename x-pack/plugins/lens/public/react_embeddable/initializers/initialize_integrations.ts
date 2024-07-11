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

export function initializeIntegrations(getState: GetStateType) {
  const isTextBasedLanguage = () => {
    const currentState = getState().attributes;
    return !isOfQueryType(currentState?.state.query);
  };
  return {
    api: {
      getSavedVis: () => getState().attributes,
      isTextBasedLanguage,
      getTextBasedLanguage: () => {
        const query = getState().attributes?.state.query;
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
