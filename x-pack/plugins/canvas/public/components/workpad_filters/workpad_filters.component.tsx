/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { identity } from 'lodash';
import { FiltersGroup as FiltersGroupType } from './types';
import { FiltersGroup } from './filters_group.component';
import { FilterField } from '../../../types';
import { formatByKey } from './utils';

interface Props {
  filtersGroups: FiltersGroupType[];
  groupFiltersByField?: FilterField;
  onGroupByChange: (groupBy: FilterField) => void;
}

const strings = {
  getGroupBySelectLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.groupBySelect', {
      defaultMessage: 'Group by',
    }),
  getGroupByFilterGroupLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.groupByFilterGroup', {
      defaultMessage: 'Filter group',
    }),
  getGroupByFilterTypeLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.groupByFilterType', {
      defaultMessage: 'Filter type',
    }),
  getGroupByColumnLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.groupByColumn', {
      defaultMessage: 'Column',
    }),
  getWithoutGroupLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.filters_group.withoutGroup', {
      defaultMessage: 'Without group',
    }),
  getBlankValueLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.filters_group.blankValue', {
      defaultMessage: '(Blank)',
    }),
};

const groupByOptions: Array<{ value: FilterField; text: string }> = [
  { value: 'filterGroup', text: strings.getGroupByFilterGroupLabel() },
  { value: 'type', text: strings.getGroupByFilterTypeLabel() },
  { value: 'column', text: strings.getGroupByColumnLabel() },
];

export const WorkpadFilters: FC<Props> = ({
  filtersGroups,
  onGroupByChange,
  groupFiltersByField,
}) => {
  const groupedByFilterGroupField = groupFiltersByField === 'filterGroup';
  const formatter = groupFiltersByField ? formatByKey(groupFiltersByField) ?? identity : identity;

  const preparedFilterGroups = filtersGroups.map((filterGroup) => ({
    ...filterGroup,
    name:
      formatter(filterGroup.name) ??
      (groupedByFilterGroupField ? strings.getWithoutGroupLabel() : strings.getBlankValueLabel()),
  }));

  const filtersGroupsComponents = preparedFilterGroups.map((filtersGroup, index) => {
    return <FiltersGroup key={`filter-group-${index}`} id={index} filtersGroup={filtersGroup} />;
  });

  return (
    <Fragment>
      <div className="canvasSidebar__panel canvasSidebar__expandable">
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem>
            <EuiText>
              <h5>{strings.getGroupBySelectLabel()}</h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSelect
              compressed
              options={groupByOptions}
              value={groupFiltersByField}
              onChange={(e) => onGroupByChange(e.target.value as FilterField)}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      {filtersGroupsComponents}
    </Fragment>
  );
};
