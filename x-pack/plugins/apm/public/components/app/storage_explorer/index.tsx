/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { IndexLifecyclePhaseSelect } from './index_lifecycle_phase_select';
import { ServicesTable } from './services_table';
import { SearchBar } from '../../shared/search_bar';

export function StorageExplorer() {
  return (
    <>
      <SearchBar />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <IndexLifecyclePhaseSelect />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <ServicesTable />
    </>
  );
}
