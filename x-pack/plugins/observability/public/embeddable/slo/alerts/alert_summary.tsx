/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { observabilityAlertFeatureIds } from '../../../../common/constants';
type SloIdAndInstanceId = [string, string];

export function AlertSummary({ slos, deps }) {
  const {
    charts,
    triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
  } = deps;
  const slosWithoutName = slos.map((slo) => ({
    id: slo.id,
    instanceId: slo.instanceId,
  }));
  const sloIdsAndInstanceIds = slosWithoutName.map(Object.values) as SloIdAndInstanceId[];
  const esQuery = {
    bool: {
      filter: [
        {
          range: {
            '@timestamp': {
              gte: 'now-5m/m',
            },
          },
        },
        {
          term: {
            'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
          },
        },
        {
          term: {
            'kibana.alert.status': 'active',
          },
        },
      ],
      should: sloIdsAndInstanceIds.map(([sloId, instanceId]) => ({
        bool: {
          filter: [{ term: { 'slo.id': sloId } }, { term: { 'slo.instanceId': instanceId } }],
        },
      })),
      minimum_should_match: 1,
    },
  };
  const alertSummaryTimeRange = {
    utcFrom: '2023-11-10T15:00:00.000Z',
    utcTo: '2023-11-15T15:00:00.000Z',
    fixedInterval: '60s',
  };
  const chartProps = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
    onBrushEnd: () => {},
  };
  return (
    <AlertSummaryWidget
      featureIds={observabilityAlertFeatureIds}
      filter={esQuery}
      timeRange={alertSummaryTimeRange}
      chartProps={chartProps}
    />
  );
}
