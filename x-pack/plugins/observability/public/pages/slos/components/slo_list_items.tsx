/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { useFetchRulesForSlo } from '../../../hooks/slo/use_fetch_rules_for_slo';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { useDeleteSlo } from '../../../hooks/slo/use_delete_slo';
import { SloListItem } from './slo_list_item';
import { SloListEmpty } from './slo_list_empty';
import { SloListError } from './slo_list_error';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
}

export function SloListItems({ sloList, loading, error }: Props) {
  const sloIds = sloList.map((slo) => slo.id);

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({ sloIds });
  const { data: rulesBySlo } = useFetchRulesForSlo({ sloIds });
  const { isLoading: historicalSummaryLoading, sloHistoricalSummaryResponse } =
    useFetchHistoricalSummary({ sloIds });

  const { mutate: deleteSlo } = useDeleteSlo();

  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }
  if (!loading && error) {
    return <SloListError />;
  }

  const handleDelete = (slo: SLOWithSummaryResponse) => {
    deleteSlo({ id: slo.id, name: slo.name });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {sloList.map((slo) => (
        <EuiFlexItem key={slo.id}>
          <SloListItem
            activeAlerts={activeAlertsBySlo[slo.id]}
            rules={rulesBySlo?.[slo.id]}
            historicalSummary={sloHistoricalSummaryResponse?.[slo.id]}
            historicalSummaryLoading={historicalSummaryLoading}
            slo={slo}
            onConfirmDelete={handleDelete}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
