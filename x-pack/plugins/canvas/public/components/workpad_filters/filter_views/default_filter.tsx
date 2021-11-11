/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterFieldProps, FilterViewSpec } from '../../../../types';
import { formatByKey } from '../utils';

const strings = {
  getTypeLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.defaultFilter.type', {
      defaultMessage: 'Type',
    }),
  getColumnLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.defaultFilter.column', {
      defaultMessage: 'Column',
    }),
  getFilterGroupLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.defaultFilter.filterGroup', {
      defaultMessage: 'Filter group',
    }),
  getValueLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.defaultFilter.value', {
      defaultMessage: 'Value',
    }),
  getNoGroupLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.defaultFilter.filterGroupsComponent.noGroup', {
      defaultMessage: 'No group',
    }),
};

const NO_GROUP = 'no_group';

const GroupComponent: FC<FilterFieldProps> = ({ filter, filterGroups = [], updateFilter }) => {
  const { filterGroup } = filter;

  const uniqueGroups = [...new Set([undefined, ...filterGroups])];
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
  view: {
    column: { label: strings.getColumnLabel() },
    value: { label: strings.getValueLabel() },
    type: { label: strings.getTypeLabel(), formatter: formatByKey('type') },
    filterGroup: { label: strings.getFilterGroupLabel(), component: GroupComponent },
  },
};
