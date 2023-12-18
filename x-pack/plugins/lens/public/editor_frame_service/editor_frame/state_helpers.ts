/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasourceState } from '../../state_management';
import { Datasource, IndexPatternMap } from '../../types';

export function getMissingIndexPattern(
  currentDatasource: Datasource | null | undefined,
  currentDatasourceState: DatasourceState | null,
  indexPatterns: IndexPatternMap
) {
  if (
    currentDatasourceState?.isLoading ||
    currentDatasourceState?.state == null ||
    currentDatasource == null
  ) {
    return [];
  }
  const missingIds = currentDatasource.checkIntegrity(currentDatasourceState.state, indexPatterns);
  if (!missingIds.length) {
    return [];
  }
  return missingIds;
}
