/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../../../typings/elasticsearch';
import { UIFilters } from '../../../../typings/ui_filters';
import {
  localUIFilters,
  localUIFilterNames,
} from '../../rum_client/ui_filters/local_ui_filters/config';
import { esKuery } from '../../../../../../../src/plugins/data/server';

export function getEsFilter(uiFilters: UIFilters) {
  const { kuery, environment, ...localFilterValues } = uiFilters;
  const mappedFilters = localUIFilterNames
    .filter((name) => name in localFilterValues)
    .map((filterName) => {
      const field = localUIFilters[filterName];
      const value = localFilterValues[filterName];
      return {
        terms: {
          [field.fieldName]: value,
        },
      };
    }) as ESFilter[];

  const esFilters = [...getKueryUiFilterES(uiFilters.kuery), ...mappedFilters];

  return esFilters;
}

function getKueryUiFilterES(kuery?: string) {
  if (!kuery) {
    return [];
  }

  const ast = esKuery.fromKueryExpression(kuery);
  return [esKuery.toElasticsearchQuery(ast) as ESFilter];
}
