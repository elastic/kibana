/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { type SourcererScopeName, type SelectedDataView } from '../store/model';

import { isExperimentalSourcererEnabled } from './is_enabled';
import { sourcererAdapterSelector } from './redux/selectors';

/**
 * WARN: FOR INTERNAL USE ONLY
 * This hook provides data for experimental Sourcerer replacement in Security Solution.
 * Do not use in client code as the API will change frequently.
 * It will be extended in the future, covering more and more functionality from the current sourcerer.
 */
export const useUnstableSecuritySolutionDataView = (
  _scopeId: SourcererScopeName,
  fallbackDataView: SelectedDataView
): SelectedDataView => {
  const dataView: SelectedDataView = useSelector(sourcererAdapterSelector);

  const dataViewWithFallbacks: SelectedDataView = useMemo(() => {
    return {
      ...dataView,
      // NOTE: temporary values sourced from the fallback. Will be replaced in the near future.
      browserFields: fallbackDataView.browserFields,
      sourcererDataView: fallbackDataView.sourcererDataView,
    };
  }, [dataView, fallbackDataView.browserFields, fallbackDataView.sourcererDataView]);

  return isExperimentalSourcererEnabled() ? dataViewWithFallbacks : fallbackDataView;
};
