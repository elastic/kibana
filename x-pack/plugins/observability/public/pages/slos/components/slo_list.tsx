/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
import { SloListItem } from './slo_list_item';

export function SloList() {
  const [shouldReload, setShouldReload] = useState(false);

  const {
    sloList: { results: slos = [] },
  } = useFetchSloList({ refetch: shouldReload });

  const handleDelete = () => {
    setShouldReload(true);
  };

  useEffect(() => {
    if (shouldReload) {
      setShouldReload(false);
    }
  }, [shouldReload]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="sloList">
      {slos.length
        ? slos.map((slo) => (
            <EuiFlexItem key={slo.id}>
              <SloListItem slo={slo} onDelete={handleDelete} />
            </EuiFlexItem>
          ))
        : null}
    </EuiFlexGroup>
  );
}
