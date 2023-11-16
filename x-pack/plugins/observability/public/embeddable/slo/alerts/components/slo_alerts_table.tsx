/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';

type SloIdAndInstanceId = [string, string];
const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observability.sloEmbeddable.alert.table';

export function SloAlertsTable({ slos, deps, timeRange }) {
  const {
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
  } = deps;
  const slosWithoutName = slos.map((slo) => ({
    id: slo.id,
    instanceId: slo.instanceId,
  }));
  const sloIdsAndInstanceIds = slosWithoutName.map(Object.values) as SloIdAndInstanceId[];

  return (
    <AlertsStateTable
      query={{
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: timeRange.from,
                },
              },
            },
            {
              term: {
                'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
              },
            },
            {
              bool: {
                should: sloIdsAndInstanceIds.map(([sloId, instanceId]) => ({
                  bool: {
                    filter: [
                      { term: { 'slo.id': sloId } },
                      { term: { 'slo.instanceId': instanceId } },
                    ],
                  },
                })),
              },
            },
          ],
        },
      }}
      alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
      configurationId={AlertConsumers.SLO}
      featureIds={[AlertConsumers.SLO, AlertConsumers.OBSERVABILITY]}
      hideLazyLoader
      id={ALERTS_TABLE_ID}
      pageSize={ALERTS_PER_PAGE}
      showAlertStatusWithFlapping
      onUpdate={() => {
        console.log('!!update the table');
      }}
    />
  );
}
