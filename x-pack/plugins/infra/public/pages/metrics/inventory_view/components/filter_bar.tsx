/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { WaffleTimeControls } from './waffle/waffle_time_controls';
import { SearchBar } from './search_bar';

export const FilterBar = ({ interval }: { interval: string }) => (
  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" style={{ flexGrow: 0 }}>
    <EuiFlexItem>
      <SearchBar />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <WaffleTimeControls interval={interval} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
