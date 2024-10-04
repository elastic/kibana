import React from 'react';
import moment from 'moment';
import { FiltersGroup } from '../filters_group.component';
import { FiltersGroup as FiltersGroupType } from '../types';

const timeFormat = 'MM.dd.YYYY HH:mm';

const filtersGroup: FiltersGroupType = {
  name: 'Group 1',
  filters: [
    { type: 'exactly', column: 'project', value: 'kibana', filterGroup: 'Group 1' },
    {
      type: 'time',
      column: '@timestamp',
      value: {
        from: moment('1.01.2021 8:15', timeFormat).format(),
        to: moment('2.01.2021 17:22', timeFormat).format(),
      },
      filterGroup: 'Group 1',
    },
    { type: 'exactly', column: 'country', value: 'US', filterGroup: 'Group 1' },
    {
      type: 'time',
      column: 'time',
      value: {
        from: moment('05.21.2021 10:50', timeFormat).format(),
        to: moment('05.22.2021 4:40', timeFormat).format(),
      },
      filterGroup: 'Group 1',
    },
  ],
};

export default {
  title: 'components/WorkpadFilters/FiltersGroupComponent',
  decorators: [(story) => <div className="canvasLayout__sidebar">{story()}</div>],
};

export const Default = {
  render: () => <FiltersGroup filtersGroup={filtersGroup} id="0" />,
  name: 'default',
};

export const EmptyGroup = {
  render: () => <FiltersGroup filtersGroup={{ name: 'Group 1', filters: [] }} id="0" />,

  name: 'empty group',
};
