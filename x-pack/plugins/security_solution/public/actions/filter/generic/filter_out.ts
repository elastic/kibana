/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This module does not have any external plugin dependency on purpose
 * It will be moved to a package in following iterations
 */

import { i18n } from '@kbn/i18n';
import type { CellAction } from '@kbn/cell-actions';
import type { Filter } from '@kbn/es-query';
import type { FilterManager } from '@kbn/data-plugin/public';

export const FILTER_OUT = i18n.translate('xpack.securitySolution.actions.filterOut', {
  defaultMessage: 'Filter Out',
});
const ID = 'filterOut';
const ICON = 'minusInCircle';

export const createFilterOutAction = ({
  filterManager,
  order,
}: {
  filterManager: FilterManager;
  order?: number;
}): CellAction => ({
  id: ID,
  type: ID,
  order,
  getIconType: (): string => ICON,
  getDisplayName: () => FILTER_OUT,
  getDisplayNameTooltip: () => FILTER_OUT,
  isCompatible: async ({ field }) => field.name != null,
  execute: async ({ field }) => {
    addFilterOut(field.name, field.value, filterManager);
  },
});

export const addFilterOut = (
  fieldName: string,
  value: string[] | string | null | undefined,
  filterManager: FilterManager | undefined
) => {
  if (filterManager != null) {
    const filter = createFilterOut(fieldName, value);
    filterManager.addFilters(filter);
  }
};

const createFilterOut = (key: string, value: string[] | string | null | undefined): Filter => {
  const negate = value != null && value?.length > 0;
  const queryValue =
    value != null && value.length > 0 ? (Array.isArray(value) ? value[0] : value) : null;
  if (queryValue == null) {
    return {
      exists: {
        field: key,
      },
      meta: {
        alias: null,
        disabled: false,
        key,
        negate,
        type: 'exists',
        value: 'exists',
      },
    } as Filter;
  }
  return {
    meta: {
      alias: null,
      negate,
      disabled: false,
      type: 'phrase',
      key,
      value: queryValue,
      params: {
        query: queryValue,
      },
    },
    query: {
      match: {
        [key]: {
          query: queryValue,
          type: 'phrase',
        },
      },
    },
  };
};
