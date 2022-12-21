/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';
import React from 'react';

import type { FilterMode } from '../types';

import * as i18n from '../translations';

const toggleButtonIcons: EuiButtonGroupOptionProps[] = [
  {
    id: 'favorites',
    label: i18n.FAVORITES,
    iconType: 'starFilled',
  },
  {
    id: `recently-updated`,
    label: i18n.LAST_UPDATED,
    iconType: 'documentEdit',
  },
];

export const Filters = React.memo<{
  filterBy: FilterMode;
  setFilterBy: (filterBy: FilterMode) => void;
}>(({ filterBy, setFilterBy }) => (
  <EuiButtonGroup
    options={toggleButtonIcons}
    idSelected={filterBy}
    onChange={(f) => {
      setFilterBy(f as FilterMode);
    }}
    isIconOnly
    legend={i18n.TIMELINES_FILTER_CONTROL}
  />
));

Filters.displayName = 'Filters';
