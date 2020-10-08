/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonGroup, EuiButtonGroupOption } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { FilterMode } from '../types';

import * as i18n from '../translations';

const MY_RECENTLY_REPORTED_ID = 'myRecentlyReported';

const toggleButtonIcons: EuiButtonGroupOption[] = [
  {
    id: 'recentlyCreated',
    label: i18n.RECENTLY_CREATED_CASES,
    iconType: 'folderExclamation',
  },
  {
    id: MY_RECENTLY_REPORTED_ID,
    label: i18n.MY_RECENTLY_REPORTED_CASES,
    iconType: 'reporter',
  },
];

export const Filters = React.memo<{
  filterBy: FilterMode;
  setFilterBy: (filterBy: FilterMode) => void;
  showMyRecentlyReported: boolean;
}>(({ filterBy, setFilterBy, showMyRecentlyReported }) => {
  const options = useMemo(
    () =>
      showMyRecentlyReported
        ? toggleButtonIcons
        : toggleButtonIcons.filter((x) => x.id !== MY_RECENTLY_REPORTED_ID),
    [showMyRecentlyReported]
  );
  const onChange = useCallback(
    (filterMode: string) => {
      setFilterBy(filterMode as FilterMode);
    },
    [setFilterBy]
  );

  return <EuiButtonGroup options={options} idSelected={filterBy} onChange={onChange} isIconOnly />;
});

Filters.displayName = 'Filters';
