/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FilterGroup } from './filter_group';
import { SearchField } from '../../common/search_field';

export function ListFilters() {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={2}>
        <SearchField />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <FilterGroup />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
