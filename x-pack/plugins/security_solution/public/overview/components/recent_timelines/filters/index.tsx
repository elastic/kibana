/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonGroup, EuiButtonGroupOption } from '@elastic/eui';
import React from 'react';

import { FilterMode } from '../types';

import * as i18n from '../translations';

const toggleButtonIcons: EuiButtonGroupOption[] = [
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
  />
));

Filters.displayName = 'Filters';
