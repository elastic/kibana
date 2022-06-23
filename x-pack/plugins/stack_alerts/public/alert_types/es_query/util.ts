/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EsQueryAlertParams, SearchType, TriggersAndActionsUiDeps } from './types';

export const isSearchSourceAlert = (
  ruleParams: EsQueryAlertParams
): ruleParams is EsQueryAlertParams<SearchType.searchSource> => {
  return ruleParams.searchType === 'searchSource';
};

export const useTriggersAndActionsUiDeps = () => useKibana<TriggersAndActionsUiDeps>().services;
