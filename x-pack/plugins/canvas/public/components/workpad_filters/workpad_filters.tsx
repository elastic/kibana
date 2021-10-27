/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { WorkpadFilters as Component } from './workpad_filters.component';

export const WorkpadFilters: FC = () => {
  const filters = [
    { type: 'dropdown', column: 'project', value: 'logstash', filterGroup: 'Gamma' },
    {
      type: 'time',
      column: '@timestamp',
      value: { from: '....', to: '...' },
      filterGroup: 'Gamma',
    },

    { type: 'dropdown', column: 'project', value: 'beats', filterGroup: 'Alpha' },
    {
      type: 'time',
      column: '@timestamp',
      value: { from: '....', to: '...' },
      filterGroup: 'Alpha',
    },
  ];

  const filtersGroups = [
    {
      name: filters[0].filterGroup,
      filters: [filters[0], filters[1]],
    },
    {
      name: filters[2].filterGroup,
      filters: [filters[2], filters[3]],
    },
  ];
  return <Component filtersGroups={filtersGroups} />;
};
