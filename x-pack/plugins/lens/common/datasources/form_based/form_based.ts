/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { VisualizeEditorContext } from '../../../public/types';
import type {
  FormBasedPersistedState,
  FormBasedPrivateState,
} from '../../../public/datasources/form_based/types';
import type { DatasourceCommon, IndexPattern, IndexPatternRef } from '../../types';
import { loadInitialState } from './loader';
import { toExpression } from './to_expression';

export function getCommonFormBasedDatasource({
  defaultIndexPatternId,
  storage,
}: {
  defaultIndexPatternId?: string;
  storage?: IStorageWrapper;
}) {
  const DATASOURCE_ID = 'formBased';

  const formBasedDatasource: DatasourceCommon<FormBasedPrivateState, FormBasedPersistedState> = {
    id: DATASOURCE_ID,

    initialize(
      persistedState?: FormBasedPersistedState,
      references?: SavedObjectReference[],
      initialContext?: VisualizeFieldContext | VisualizeEditorContext,
      indexPatternRefs?: IndexPatternRef[],
      indexPatterns?: Record<string, IndexPattern>
    ) {
      return loadInitialState({
        persistedState,
        references,
        defaultIndexPatternId,
        storage,
        initialContext,
        indexPatternRefs,
        indexPatterns,
      });
    },

    getLayers(state: FormBasedPrivateState) {
      return Object.keys(state?.layers);
    },

    toExpression: (state, layerId, indexPatterns, dateRange, nowInstant, searchSessionId) =>
      toExpression(state, layerId, indexPatterns, dateRange, nowInstant, searchSessionId),
  };

  return formBasedDatasource;
}
