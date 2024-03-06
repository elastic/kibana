/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scopeIdSelector } from '../store/sourcerer/selectors';
import { useDeepEqualSelector } from './use_selector';
import type { SourcererScopeName } from '../store/sourcerer/model';

const getScopeSelector = scopeIdSelector();

export const useDataViewId = (scopeId: SourcererScopeName): string | undefined => {
  const dataView = useDeepEqualSelector((state) => getScopeSelector(state, scopeId));
  return dataView?.selectedDataViewId ?? undefined;
};
