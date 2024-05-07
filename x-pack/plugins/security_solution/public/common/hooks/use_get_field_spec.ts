/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { SourcererScopeName } from '../store/sourcerer/model';
import { sourcererSelectors } from '../store/sourcerer';
import type { State } from '../store';

export const useGetFieldSpec = (scopeId: SourcererScopeName) => {
  const kibanaDataViews = useSelector(sourcererSelectors.kibanaDataViews);
  const selectedDataViewId = useSelector((state: State) =>
    sourcererSelectors.sourcererScopeSelectedDataViewId(state, scopeId)
  );
  const dataView = useMemo(
    () => kibanaDataViews.find((dv) => dv.id === selectedDataViewId),
    [kibanaDataViews, selectedDataViewId]
  );
  return useCallback(
    (fieldName: string) => {
      const fields = dataView?.fields;
      return fields && fields[fieldName];
    },
    [dataView?.fields]
  );
};
