/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import type { FilterManager } from '@kbn/data-plugin/public';
import { createFilter } from './helpers';

export const FILTER_IN = i18n.translate('xpack.securitySolution.actions.filterIn', {
  defaultMessage: 'Filter In',
});
const ID = 'security_filterIn';
const ICON = 'plusInCircle';

export const createFilterInAction = ({
  filterManager,
  order,
}: {
  filterManager: FilterManager;
  order?: number;
}) =>
  createAction<CellActionExecutionContext>({
    id: ID,
    type: ID,
    order,
    getIconType: (): string => ICON,
    getDisplayName: () => FILTER_IN,
    getDisplayNameTooltip: () => FILTER_IN,
    isCompatible: async ({ field }) => field.name != null && field.value != null,
    execute: async ({ field }) => {
      const makeFilter = (currentVal: string | null | undefined) =>
        currentVal?.length === 0
          ? createFilter(field.name, undefined)
          : createFilter(field.name, currentVal);

      const filters = Array.isArray(field.value)
        ? field.value.map((currentVal: string | null | undefined) => makeFilter(currentVal))
        : makeFilter(field.value);

      if (filterManager != null) {
        filterManager.addFilters(filters);
      }
    },
  });
