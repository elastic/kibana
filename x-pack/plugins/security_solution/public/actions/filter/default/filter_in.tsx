/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction } from '@kbn/cell-actions';
import { i18n } from '@kbn/i18n';
import { createFilter } from '../helpers';
import { KibanaServices } from '../../../common/lib/kibana';
import { fieldHasCellActions } from '../../utils';

export const FILTER_IN = i18n.translate('xpack.securitySolution.actions.filterIn', {
  defaultMessage: 'Filter In',
});
const ID = 'security_filterIn';
const ICON = 'plusInCircle';

export const createFilterInAction = ({ order }: { order?: number }): CellAction => ({
  id: ID,
  type: ID,
  order,
  getIconType: (): string => ICON,
  getDisplayName: () => FILTER_IN,
  getDisplayNameTooltip: () => FILTER_IN,
  isCompatible: async ({ field }) => fieldHasCellActions(field.name),
  execute: async ({ field }) => {
    const services = KibanaServices.get();
    const filterManager = services.data.query.filterManager;

    const makeFilter = (currentVal: string | string[] | null | undefined) =>
      currentVal?.length === 0
        ? createFilter(field.name, null)
        : createFilter(field.name, currentVal);

    if (filterManager != null) {
      filterManager.addFilters(makeFilter(field.value));
    }
  },
});
