/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { useGetUrlParams, useUrlParams } from '../../../../hooks';
import { FilterGroup } from './filter_group';

export function ListFilters() {
  const { query } = useGetUrlParams();
  const updateUrlParams = useUrlParams()[1];

  const [search, setSearch] = useState(query || '');

  useDebounce(
    () => {
      updateUrlParams({ query: search });
    },
    300,
    [search]
  );

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={1}>
        <EuiFieldSearch
          fullWidth
          placeholder="Search this"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          isClearable={true}
          aria-label="Use aria labels when no actual label is in use"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FilterGroup />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
