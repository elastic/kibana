/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  uxLocalUIFilterNames,
  uxLocalUIFilters,
} from '../../../../common/ux_ui_filter';
import { ESFilter } from '../../../../../../../src/core/types/elasticsearch';
import { UxUIFilters } from '../../../../typings/ui_filters';
import { environmentQuery } from '../../../../common/utils/environment_query';

export function getEsFilter(uiFilters: UxUIFilters, exclude?: boolean) {
  const localFilterValues = uiFilters;
  const mappedFilters = uxLocalUIFilterNames
    .filter((name) => {
      const validFilter = name in localFilterValues;
      if (exclude) {
        return name.includes('Excluded') && validFilter;
      }
      return !name.includes('Excluded') && validFilter;
    })
    .map((filterName) => {
      const field = uxLocalUIFilters[filterName];
      const value = localFilterValues[filterName];

      return {
        terms: {
          [field.fieldName]: value,
        },
      };
    }) as ESFilter[];

  return [...mappedFilters, ...environmentQuery(uiFilters.environment)];
}
