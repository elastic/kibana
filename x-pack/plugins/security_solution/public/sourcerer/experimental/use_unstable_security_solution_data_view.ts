/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type SourcererScopeName, type SelectedDataView } from '../store/model';

import { IS_EXPERIMENTAL_SOURCERER_ENABLED } from './is_enabled';

/**
 * FOR INTERNAL USE ONLY
 * This hook provides data for experimental Sourcerer replacement in Security Solution.
 * Do not use in client code as the API will change frequently.
 * It will be extended in the future, covering more and more functionality from the current sourcerer.
 */
export const useUnstableSecuritySolutionDataView = (
  _scopeId: SourcererScopeName,
  fallbackDataView: SelectedDataView
): SelectedDataView => {
  // TODO: extend the fallback state with values computed using new logic
  return IS_EXPERIMENTAL_SOURCERER_ENABLED ? fallbackDataView : fallbackDataView;
};
