/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { SloListItem } from './slo_list_item';
import { SloListEmpty } from './slo_list_empty';
import { SloListError } from './slo_list_error';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
}

export function SloListItems({ sloList, loading, error }: Props) {
  const { isLoading: historicalSummaryLoading, sloHistoricalSummaryResponse } =
    useFetchHistoricalSummary({ sloIds: sloList.map((slo) => slo.id) });

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({
    sloIds: sloList.map((slo) => slo.id),
  });

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
            historicalSummary={sloHistoricalSummaryResponse?.[slo.id]}
            historicalSummaryLoading={historicalSummaryLoading}
            activeAlerts={activeAlertsBySlo[slo.id]}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
