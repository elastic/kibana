/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useFetchSloList } from '../hooks/use_fetch_slo_list';

export function SloList() {
  const [isLoading, sloList] = useFetchSloList();

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="sloList">
      <EuiFlexItem>{!isLoading && <pre>{JSON.stringify(sloList, null, 2)}</pre>}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
