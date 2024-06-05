/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type SourcererScopeName, type SelectedDataView } from '../store/model';

/**
 * FOR INTERNAL USE ONLY
 * This hook provides data for experimental Sourcerer replacement in Security Solution.
 * Do not use in client code as the API will change frequently.
 */
export const useUnstableSecuritySolutionDataView = (
  _scopeId: SourcererScopeName
): SelectedDataView => {
  return useMemo(() => {
    return {
      loading: false,
      browserFields: {},
      dataViewId: '',
      indicesExist: true,
      selectedPatterns: [],
      patternList: [],
      activePatterns: [],
      runtimeMappings: {},
      sourcererDataView: undefined,
      indexPattern: {
        title: '',
        fields: [],
      },
    } as SelectedDataView;
  }, []);
};
