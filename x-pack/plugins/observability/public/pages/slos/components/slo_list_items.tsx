/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { ActiveAlerts } from '../../../hooks/slo/active_alerts';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { UseFetchRulesForSloResponse } from '../../../hooks/slo/use_fetch_rules_for_slo';
import { SloListItem } from './slo_list_item';
import { SloListCompactView } from './compact_view/slo_list_compact_view';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  activeAlertsBySlo: ActiveAlerts;
  rulesBySlo?: UseFetchRulesForSloResponse['data'];
  loading: boolean;
  error: boolean;
  isCompact?: boolean;
}

export function SloListItems({
  sloList,
  activeAlertsBySlo,
  rulesBySlo,
  loading,
  error,
  isCompact = true,
}: Props) {
  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      list: sloList.map((slo) => ({ sloId: slo.id, instanceId: slo.instanceId ?? ALL_VALUE })),
    });

  return (
    <EuiFlexItem>
      {isCompact && <SloListCompactView sloList={sloList} loading={loading} error={error} />}
      {!isCompact && (
        <EuiFlexGroup direction="column" gutterSize="s">
          {sloList.map((slo) => (
            <EuiFlexItem key={`${slo.id}-${slo.instanceId ?? ALL_VALUE}`}>
              <SloListItem
                activeAlerts={activeAlertsBySlo.get(slo)}
                rules={rulesBySlo?.[slo.id]}
                historicalSummary={
                  historicalSummaries.find(
                    (historicalSummary) =>
                      historicalSummary.sloId === slo.id &&
                      historicalSummary.instanceId === (slo.instanceId ?? ALL_VALUE)
                  )?.data
                }
                historicalSummaryLoading={historicalSummaryLoading}
                slo={slo}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiFlexItem>
  );
}
