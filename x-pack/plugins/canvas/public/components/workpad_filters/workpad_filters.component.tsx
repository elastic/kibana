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

interface Props {
  filtersGroups: FiltersGroupType[];
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

export const WorkpadFilters: FC<Props> = ({ filtersGroups }) => {
  const groupByOptions = [
    { value: 'filter_group', text: strings.getGroupByFilterGroupLabel() },
    { value: 'filter_type', text: strings.getGroupByFilterTypeLabel() },
    { value: 'column', text: strings.getGroupByColumnLabel() },
  ];

  const filtersGroupsComponents = filtersGroups.map((filtersGroup) => (
    <FiltersGroup {...filtersGroup} />
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
              // value={'group'}
              // onChange={e => onChange(e)}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      {filtersGroupsComponents}
    </Fragment>
  );
};
