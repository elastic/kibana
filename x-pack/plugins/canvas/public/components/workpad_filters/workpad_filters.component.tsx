/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FiltersGroup as FiltersGroupType } from './types';
import { FiltersGroup } from './filters_group';
import { FilterField, Filter } from '../../../types';

interface Props {
  filtersGroups: FiltersGroupType[];
  groupFiltersByField?: FilterField;
  filters: Filter[];
  onGroupByChange: (groupBy: FilterField) => void;
}

const strings = {
  getGroupBySelectLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.groupBySelect', {
      defaultMessage: 'Group by',
    }),
  getGroupByFilterGroupLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.groupByFilterGroup', {
      defaultMessage: 'Filter group',
    }),
  getGroupByFilterTypeLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.groupByFilterType', {
      defaultMessage: 'Filter type',
    }),
  getGroupByColumnLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.groupByColumn', {
      defaultMessage: 'Column',
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
  filters,
}) => {
  const filtersGroupsComponents = filtersGroups.map((filtersGroup, index) => (
    <FiltersGroup key={`filter-group-${index}`} filtersGroup={filtersGroup} filters={filters} />
  ));

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
