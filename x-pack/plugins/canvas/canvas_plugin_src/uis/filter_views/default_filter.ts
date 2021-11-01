/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FilterViewSpec } from '../../../public/filter_view_types';

const strings = {
  getTypeLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.defaultFilter.type', {
      defaultMessage: 'Type',
    }),
  getColumnLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.defaultFilter.column', {
      defaultMessage: 'Column',
    }),
  getFilterGroupLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.defaultFilter.filterGroup', {
      defaultMessage: 'Filter group',
    }),
  getValueLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.defaultFilter.value', {
      defaultMessage: 'Value',
    }),
};

export const defaultFilter: FilterViewSpec = {
  name: 'default',
  view: () => ({
    type: {
      label: strings.getTypeLabel(),
    },
    column: {
      label: strings.getColumnLabel(),
    },
    filterGroup: {
      label: strings.getFilterGroupLabel(),
    },
    value: {
      label: strings.getValueLabel(),
    },
  }),
};
