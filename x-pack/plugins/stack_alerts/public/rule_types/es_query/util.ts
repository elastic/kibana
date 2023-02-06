/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { FieldOption } from '@kbn/triggers-actions-ui-plugin/public/common';
import { EsQueryRuleParams, SearchType } from './types';

export const isSearchSourceRule = (
  ruleParams: EsQueryRuleParams
): ruleParams is EsQueryRuleParams<SearchType.searchSource> => {
  return ruleParams.searchType === 'searchSource';
};

export const convertFieldSpecToFieldOption = (fieldSpec: FieldSpec[]): FieldOption[] => {
  return (fieldSpec ?? [])
    .filter((spec: FieldSpec) => spec.isMapped)
    .map((spec: FieldSpec) => {
      const converted = {
        name: spec.name,
        searchable: spec.searchable,
        aggregatable: spec.aggregatable,
        type: spec.type,
        normalizedType: spec.type,
      };

      if (spec.type === 'string') {
        const esType = spec.esTypes && spec.esTypes.length > 0 ? spec.esTypes[0] : spec.type;
        converted.type = esType;
        converted.normalizedType = esType;
      } else if (spec.type === 'number') {
        const esType = spec.esTypes && spec.esTypes.length > 0 ? spec.esTypes[0] : spec.type;
        converted.type = esType;
      }

      return converted;
    });
};

export const useTriggerUiActionServices = () => useKibana().services;
