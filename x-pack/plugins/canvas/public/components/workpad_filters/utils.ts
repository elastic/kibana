/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FilterField } from '../../../types';

const strings = {
  getBlankLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.filter.blankTypeLabel', {
      defaultMessage: '(Blank)',
    }),
  getExactlyFilterTypeLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.defaultFilter.typeLabel', {
      defaultMessage: 'Dropdown',
    }),
  getTimeFilterTypeLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.timeFilter.typeLabel', {
      defaultMessage: 'Time',
    }),
};

const formatType = (type: unknown) => {
  const types: Record<string, string> = {
    exactly: strings.getExactlyFilterTypeLabel(),
    time: strings.getTimeFilterTypeLabel(),
  };

  const formattedType = typeof type === 'string' ? types[type] : strings.getBlankLabel();
  return formattedType ?? strings.getBlankLabel();
};

const formatters: Partial<Record<FilterField, (value: unknown) => string>> = {
  type: formatType,
};

export const formatByKey = (key: FilterField) => formatters[key];
