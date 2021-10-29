/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSelect } from '@elastic/eui';
import { Filter } from '../../../types';
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

interface Props {
  value: string;
  onFilterChange: (value: string) => void;
  filters: Filter[];
}

const FilterGroupSelect: FC<Props> = ({ value, onFilterChange, filters }) => {
  const filterGroups = filters
    .filter(({ filterGroup }) => Boolean(filterGroup))
    .map(({ filterGroup }) => ({
      text: filterGroup,
      value: filterGroup,
    }));

  return (
    <EuiSelect
      compressed
      options={[{ text: 'No group', value: 'null' }, ...filterGroups]}
      value={value}
      onChange={(e) => onFilterChange(e.target.value)}
      aria-label="Use aria labels when no actual label is in use"
    />
  );
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
      component: FilterGroupSelect,
    },
    value: {
      label: strings.getValueLabel(),
    },
  }),
};
