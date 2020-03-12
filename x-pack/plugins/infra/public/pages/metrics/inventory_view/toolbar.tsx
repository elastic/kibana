/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { Toolbar } from '../../../components/eui/toolbar';
import { WaffleTimeControls } from './compontents/waffle/waffle_time_controls';
import { WaffleInventorySwitcher } from './compontents/waffle/waffle_inventory_switcher';
import { SearchBar } from './compontents/search_bar';

export const SnapshotToolbar = () => (
  <Toolbar>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
      <EuiFlexItem grow={false}>
        <WaffleInventorySwitcher />
      </EuiFlexItem>
      <EuiFlexItem>
        <SearchBar />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WaffleTimeControls />
      </EuiFlexItem>
    </EuiFlexGroup>
  </Toolbar>
);
