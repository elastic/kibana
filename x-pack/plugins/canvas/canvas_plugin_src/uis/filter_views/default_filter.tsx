/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSelect } from '@elastic/eui';
import { FilterViewSpec } from '../../../public/filter_view_types';
import { FilterFieldProps } from '../../../types';

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
  getNoGroupLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.defaultFilter.filterGroupsComponent.noGroup', {
      defaultMessage: 'No group',
    }),
};
const NO_GROUP = 'no_group';

const GroupComponent: FC<FilterFieldProps> = ({ filter, availableFilters, updateFilter }) => {
  const { filterGroup } = filter;
  const availableFilterGroups = availableFilters
    .filter(({ filterGroup: group }) => group)
    .map(({ filterGroup: group }) => group);

  const uniqueGroups = [...new Set([undefined, ...availableFilterGroups])];
  const groups = uniqueGroups.map((group) => ({
    text: group ?? strings.getNoGroupLabel(),
    value: group ?? NO_GROUP,
  }));

  return (
    <EuiSelect
      compressed
      options={groups}
      value={filterGroup ?? undefined}
      onChange={({ target: { value } }) => {
        const selectedGroup = value === NO_GROUP ? null : value;
        updateFilter?.({ ...filter, filterGroup: selectedGroup });
      }}
      aria-label="Change filter group"
    />
  );
};

export const defaultFilter: FilterViewSpec = {
  name: 'default',
  view: () => ({
    type: { label: strings.getTypeLabel() },
    column: { label: strings.getColumnLabel() },
    filterGroup: { label: strings.getFilterGroupLabel(), component: GroupComponent },
    value: { label: strings.getValueLabel() },
  }),
};
