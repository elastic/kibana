/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
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

storiesOf('components/WorkpadFilters/FiltersGroupComponent', module)
  .addDecorator((story) => <div className="canvasLayout__sidebar">{story()}</div>)
  .add('default', () => <FiltersGroup filtersGroup={filtersGroup} id="0" />)
  .add('empty group', () => (
    <FiltersGroup filtersGroup={{ name: 'Group 1', filters: [] }} id="0" />
  ));
