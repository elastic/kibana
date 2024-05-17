/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import type { State } from '../store';
import type { SourcererScopeName } from '../store/sourcerer/model';
import { sourcererScopeSelectedDataViewId } from '../store/sourcerer/selectors';

export const useDataViewId = (scopeId: SourcererScopeName): string | undefined => {
  const dataViewId = useSelector((state: State) =>
    sourcererScopeSelectedDataViewId(state, scopeId)
  );
  return dataViewId ?? undefined;
};
