/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { createFilter } from '../helpers';
import { KibanaServices } from '../../../common/lib/kibana';

export const FILTER_OUT = i18n.translate('xpack.securitySolution.actions.filterOut', {
  defaultMessage: 'Filter Out',
});
const ID = 'security_filterOut';
const ICON = 'minusInCircle';

export const createFilterOutAction = ({ order }: { order?: number }) =>
  createAction<CellActionExecutionContext>({
    id: ID,
    type: ID,
    order,
    getIconType: (): string => ICON,
    getDisplayName: () => FILTER_OUT,
    getDisplayNameTooltip: () => FILTER_OUT,
    isCompatible: async ({ field }: CellActionExecutionContext) =>
      field.name != null && field.value != null,
    execute: async ({ field }: CellActionExecutionContext) => {
      const services = KibanaServices.get();
      const filterManager = services.data.query.filterManager;

      const makeFilter = (currentVal: string | string[] | null | undefined) =>
        currentVal == null || currentVal?.length === 0
          ? createFilter(field.name, null, false)
          : createFilter(field.name, currentVal, true);

      if (filterManager != null) {
        filterManager.addFilters(makeFilter(field.value));
      }
    },
  });
