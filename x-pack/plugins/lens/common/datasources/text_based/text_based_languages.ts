/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toExpression } from './to_expression';
import type {
  TextBasedPrivateState,
  TextBasedPersistedState,
} from '../../../public/datasources/text_based/types';
import { DatasourceCommon } from '../../types';

export const TextBasedDatasourceCommon: DatasourceCommon<
  TextBasedPrivateState,
  TextBasedPersistedState
> = {
  id: 'textBased',

  initialize(
    state?: TextBasedPersistedState,
    savedObjectReferences?,
    context?,
    indexPatternRefs?,
    indexPatterns?
  ) {
    const patterns = indexPatterns ? Object.values(indexPatterns) : [];
    const refs = patterns.map((p) => {
      return {
        id: p.id,
        title: p.title,
        timeField: p.timeFieldName,
      };
    });

    const initState = state || { layers: {} };
    return {
      ...initState,
      indexPatternRefs: refs,
      initialContext: context,
    };
  },

  getLayers(state: TextBasedPrivateState) {
    return state && state.layers ? Object.keys(state?.layers) : [];
  },

  toExpression: (state, layerId, indexPatterns, dateRange, searchSessionId) => {
    return toExpression(state, layerId);
  },
};
