/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { TimeRange } from '@kbn/es-query';
import { ALL_VALUE } from '@kbn/slo-schema';
import { SloEmbeddableDeps } from '../slo_alerts_embeddable';
import type { SloItem } from '../types';
import { SLO_ALERTS_TABLE_CONFID } from '../../constants';

type SloIdAndInstanceId = [string, string];
interface FilterQuery {
  [key: string]: any;
}
const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observability.sloAlertsEmbeddable.alert.table';

interface Props {
  deps: SloEmbeddableDeps;
  slos: SloItem[];
  timeRange: TimeRange;
  onLoaded?: () => void;
  lastReloadRequestTime: number | undefined;
}

export function SloAlertsTable({ slos, deps, timeRange, onLoaded, lastReloadRequestTime }: Props) {
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
                should: sloIdsAndInstanceIds.map(([sloId, instanceId]) => {
                  const filterQuery = [{ term: { 'slo.id': sloId } } as FilterQuery];
                  if (instanceId !== ALL_VALUE) {
                    filterQuery.push({ term: { 'slo.instanceId': instanceId } });
                  }
                  return {
                    bool: {
                      filter: filterQuery,
                    },
                  };
                }),
              },
            },
          ],
        },
      }}
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
