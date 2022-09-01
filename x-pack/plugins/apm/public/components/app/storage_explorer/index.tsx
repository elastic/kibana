/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { IndexLifecyclePhaseSelectOption } from '../../../../common/storage_explorer_types';
import { IndexLifecyclePhaseSelect } from './index_lifecycle_phase_select';
import { ServicesTable } from './services_table';
import { SearchBar } from '../../shared/search_bar';
import { StorageChart } from './storage_chart';

export function StorageExplorer() {
  const [indexLifecyclePhase, setIndexLifecyclePhase] = useState(
    IndexLifecyclePhaseSelectOption.Hot
  );

  return (
    <>
      <SearchBar />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <IndexLifecyclePhaseSelect
            indexLifecyclePhase={indexLifecyclePhase}
            onChange={setIndexLifecyclePhase}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <StorageChart indexLifecyclePhase={indexLifecyclePhase} />
      <EuiSpacer />
      <ServicesTable indexLifecyclePhase={indexLifecyclePhase} />
    </>
  );
}
