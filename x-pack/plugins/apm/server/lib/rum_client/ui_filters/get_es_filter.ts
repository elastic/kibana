/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../../../../typings/elasticsearch';
import { UIFilters } from '../../../../typings/ui_filters';
import { localUIFilters, localUIFilterNames } from './local_ui_filters/config';
import { SERVICE_ENVIRONMENT } from '../../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

export function getEsFilter(uiFilters: UIFilters) {
  const localFilterValues = uiFilters;
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

  if (
    uiFilters.environment &&
    uiFilters.environment !== ENVIRONMENT_ALL.value
  ) {
    mappedFilters.push({
      term: {
        [SERVICE_ENVIRONMENT]: uiFilters.environment,
      },
    });
  }

  return mappedFilters;
}
