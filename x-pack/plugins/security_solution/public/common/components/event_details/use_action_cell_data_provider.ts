/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeDataProviderId } from '@kbn/securitysolution-t-grid';

import { getDisplayValue } from '../../../timelines/components/timeline/data_providers/helpers';
import type { DataProvider, DataProvidersAnd, QueryOperator } from '../../../../common/types';
import { IS_OPERATOR } from '../../../../common/types';

export const getDataProvider = (
  field: string,
  id: string,
  value: string | string[],
  operator: QueryOperator = IS_OPERATOR,
  excluded: boolean = false
): DataProvider => ({
  and: [],
  enabled: true,
  id: escapeDataProviderId(id),
  name: field,
  excluded,
  kqlQuery: '',
  queryMatch: {
    field,
    value,
    operator,
    displayValue: getDisplayValue(value),
  },
});

export const getDataProviderAnd = (
  field: string,
  id: string,
  value: string | string[],
  operator: QueryOperator = IS_OPERATOR,
  excluded: boolean = false
): DataProvidersAnd => {
  const { and, ...dataProvider } = getDataProvider(field, id, value, operator, excluded);
  return dataProvider;
};
