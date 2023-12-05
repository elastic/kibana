/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { TimeRange } from '@kbn/es-query';
import { ALL_VALUE } from '@kbn/slo-schema';
import { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import { SloEmbeddableDeps } from '../slo_alerts_embeddable';
import type { SloItem } from '../types';
import { SLO_ALERTS_TABLE_CONFID } from '../../constants';

const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observability.sloAlertsEmbeddable.alert.table';

interface Props {
  deps: SloEmbeddableDeps;
  slos: SloItem[];
  timeRange: TimeRange;
  onLoaded?: () => void;
  lastReloadRequestTime: number | undefined;
}

const useSloAlertsQuery = (
  slos: SloItem[],
  timeRange: TimeRange,
  lastReloadRequestTime?: number
) => {
  return useMemo(() => {
    const sloInstanceIds = slos
      .filter((slo) => slo.instanceId !== ALL_VALUE)
      .map((slo) => slo.instanceId);
    const sloIds = slos.filter((slo) => slo.instanceId === ALL_VALUE).map((slo) => slo.id);

    const query: AlertsTableStateProps['query'] = {
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
              should: [
                ...(sloIds.length > 0 ? [{ terms: { 'slo.id': sloIds } }] : []),
                ...(sloInstanceIds.length > 0
                  ? [{ terms: { 'slo.instanceId': sloInstanceIds } }]
                  : []),
              ],
            },
          },
        ],
      },
    };

    return query;
  }, [slos, timeRange]);
};

export function SloAlertsTable({ slos, deps, timeRange, onLoaded, lastReloadRequestTime }: Props) {
  const {
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
  } = deps;

  return (
    <AlertsStateTable
      query={useSloAlertsQuery(slos, timeRange, lastReloadRequestTime)}
      alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
      configurationId={SLO_ALERTS_TABLE_CONFID}
      featureIds={[AlertConsumers.SLO, AlertConsumers.OBSERVABILITY]}
      hideLazyLoader
      id={ALERTS_TABLE_ID}
      pageSize={ALERTS_PER_PAGE}
      showAlertStatusWithFlapping
      onLoaded={() => {
        if (onLoaded) {
          onLoaded();
        }
      }}
      lastReloadRequestTime={lastReloadRequestTime}
    />
  );
}
