/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FieldOption } from '@kbn/triggers-actions-ui-plugin/public/common';
import { EsQueryRuleParams, SearchType, TriggersAndActionsUiDeps } from './types';

export const isSearchSourceRule = (
  ruleParams: EsQueryRuleParams
): ruleParams is EsQueryRuleParams<SearchType.searchSource> => {
  return ruleParams.searchType === 'searchSource';
};

export const useTriggersAndActionsUiDeps = () => useKibana<TriggersAndActionsUiDeps>().services;

export const convertFieldSpecToFieldOption = (fieldSpec: FieldSpec[]): FieldOption[] =>
  (fieldSpec ?? []).map((spec: FieldSpec) => ({
    name: spec.name,
    type: spec.type,
    normalizedType: spec.type,
    searchable: spec.searchable,
    aggregatable: spec.aggregatable,
  }));
