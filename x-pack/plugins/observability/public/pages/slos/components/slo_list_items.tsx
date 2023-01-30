/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { SloListItem } from './slo_list_item';
import { SloListEmpty } from './slo_list_empty';
import { SloListError } from './slo_list_error';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
  onDeleted: () => void;
  onDeleting: () => void;
}

export function SloListItems({ sloList, loading, error, onDeleted, onDeleting }: Props) {
  const [sloIds, setSloIds] = useState<string[]>([]);
  useEffect(() => {
    setSloIds(sloList.map((slo) => slo.id));
  }, [sloList]);

  const { loading: historicalSummaryLoading, data: historicalSummaryBySlo } =
    useFetchHistoricalSummary({ sloIds });

  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }
  if (!loading && error) {
    return <SloListError />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {sloList.map((slo) => (
        <EuiFlexItem key={slo.id}>
          <SloListItem
            slo={slo}
            historicalSummary={historicalSummaryBySlo[slo.id]}
            historicalSummaryLoading={historicalSummaryLoading}
            onDeleted={onDeleted}
            onDeleting={onDeleting}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
