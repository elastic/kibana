/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';

// @ts-expect-error
import { getDefaultPage } from '../../../state/defaults';
import { reduxDecorator } from '../../../../storybook';
import { FiltersGroup } from '../filters_group';
import { FiltersGroup as FiltersGroupType } from '../types';
import { FilterViewSpec, filterViewsRegistry } from '../../../filter_view_types';
import { filterViewsSpecs } from '../../../../canvas_plugin_src/canvas_addons';

filterViewsSpecs.forEach((filterView) =>
  filterViewsRegistry.register(() => filterView as FilterViewSpec<any>)
);

const filtersGroup: FiltersGroupType = {
  name: 'Group 1',
  filters: [
    { type: 'exactly', column: 'project', value: 'kibana', filterGroup: 'Group 1' },
    {
      type: 'time',
      column: '@timestamp',
      value: { from: 'some time', to: 'some time' },
      filterGroup: 'Group 1',
    },
    { type: 'exactly', column: 'country', value: 'US', filterGroup: 'Group 1' },
    {
      type: 'time',
      column: 'time',
      value: { from: 'some time', to: 'some time' },
      filterGroup: 'Group 1',
    },
  ],
};

storiesOf('components/WorkpadFilters/FiltersGroup', module)
  // .addDecorator(reduxDecorator({ pages }))
  .addDecorator((story) => <div className="canvasLayout__sidebar">{story()}</div>)
  .add('default', () => <FiltersGroup filtersGroup={filtersGroup} />);
