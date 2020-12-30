/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { WaffleTimeControls } from './waffle/waffle_time_controls';
import { SearchBar } from './search_bar';
import { ToolbarPanel } from '../../../../components/toolbar_panel';

export const FilterBar = () => (
  <ToolbarPanel>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
      <EuiFlexItem>
        <SearchBar />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WaffleTimeControls />
      </EuiFlexItem>
    </EuiFlexGroup>
  </ToolbarPanel>
);
