/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiText, EuiTextColor } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Filter as FilterType, FormattedFilterViewInstance } from '../../../../types';
import { createFilledFilterView } from '../../../lib/filter';
import { Filter } from '../filter.component';
import { filterViews } from '../filter_views';
import { group1, group2 } from './elements';

const filter: FormattedFilterViewInstance = {
  type: {
    label: 'Type',
    formattedValue: 'exactly',
  },
  column: {
    label: 'Column',
    formattedValue: 'project',
  },
  value: {
    label: 'Value',
    formattedValue: 'kibana',
  },
  filterGroup: {
    label: 'Filter group',
    formattedValue: 'Group 1',
  },
};

const defaultFilter: FilterType = {
  id: 0,
  type: 'exactly',
  column: 'project',
  value: 'kibana',
  filterGroup: group1,
};

const timeFilter: FilterType = {
  id: 0,
  type: 'time',
  column: '@timestamp',
  value: { from: '2011-09-10T14:48:00', to: '2011-10-10T14:48:00' },
  filterGroup: group2,
};

const groups = [group1, group2];

const component: FC<any> = ({ value }) => (
  <EuiText>
    <EuiTextColor color="secondary">
      <h3>{value}</h3>
    </EuiTextColor>
  </EuiText>
);

storiesOf('components/WorkpadFilters/FilterComponent', module)
  .add('default', () => <Filter filterView={filter} />)
  .add('with component field', () => (
    <Filter filterView={{ ...filter, value: { ...filter.value, component } }} />
  ))
  .add('with custom filter fields', () => (
    <Filter
      filterView={{
        ...filter,
        customField: { label: 'Custom Field', formattedValue: 'Some unknown field' },
      }}
    />
  ));

storiesOf('components/WorkpadFilters/FilterComponent/filter_views', module)
  .add('default', () => (
    <Filter
      filterView={createFilledFilterView(filterViews.default.view, defaultFilter)}
      filter={defaultFilter}
      filterGroups={groups}
      updateFilter={action('updateFilter')}
    />
  ))
  .add('time', () => (
    <Filter
      filterView={createFilledFilterView(filterViews.time.view, timeFilter)}
      filter={timeFilter}
      filterGroups={groups}
      updateFilter={action('updateFilter')}
    />
  ));