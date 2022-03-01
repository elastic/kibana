/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Columns } from '../../paginated_table';
import { AnomaliesBy, Anomaly } from '../types';

import { EntityDraggable } from '../entity_draggable';
import { createCompoundAnomalyKey } from './create_compound_key';

import * as i18n from './translations';
import { getEntries } from '../get_entries';
import { DraggableScore } from '../score/draggable_score';
import { ExplorerLink } from '../links/create_explorer_link';
import { escapeDataProviderId } from '../../drag_and_drop/helpers';
import { FormattedRelativePreferenceDate } from '../../formatted_date';

export const getAnomaliesDefaultTableColumns = (
  startDate: string,
  endDate: string
): [
  Columns<Anomaly['severity'], AnomaliesBy>,
  Columns<Anomaly['jobId'], AnomaliesBy>,
  Columns<Anomaly['entityValue'], AnomaliesBy>,
  Columns<Anomaly['influencers'], AnomaliesBy>,
  Columns<Anomaly['time'], AnomaliesBy>
] => [
  {
    name: i18n.DETECTOR,
    field: 'anomaly.jobId',
    sortable: true,
    render: (jobId, anomalyBy) => (
      <ExplorerLink
        score={anomalyBy.anomaly}
        startDate={startDate}
        endDate={endDate}
        linkName={jobId}
      />
    ),
  },
  {
    name: i18n.SCORE,
    field: 'anomaly.severity',
    sortable: true,
    render: (_, anomalyBy) => (
      <DraggableScore
        id={escapeDataProviderId(
          `anomalies-table-severity-${createCompoundAnomalyKey(anomalyBy.anomaly)}`
        )}
        score={anomalyBy.anomaly}
      />
    ),
  },
  {
    name: i18n.ENTITY,
    field: 'anomaly.entityValue',
    sortable: true,
    render: (entityValue, anomalyBy) => (
      <EntityDraggable
        idPrefix={`anomalies-table-entityValue${createCompoundAnomalyKey(
          anomalyBy.anomaly
        )}-entity`}
        entityName={anomalyBy.anomaly.entityName}
        entityValue={entityValue}
      />
    ),
  },
  {
    name: i18n.INFLUENCED_BY,
    field: 'anomaly.influencers',
    render: (influencers, anomalyBy) => (
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        {influencers &&
          influencers.map((influencer) => {
            const [key, value] = getEntries(influencer);
            const entityName = key != null ? key : '';
            const entityValue = value != null ? value : '';
            return (
              <EuiFlexItem
                key={`${entityName}-${entityValue}-${createCompoundAnomalyKey(anomalyBy.anomaly)}`}
                grow={false}
              >
                <EuiFlexGroup gutterSize="none" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EntityDraggable
                      idPrefix={`anomalies-table-influencers-${entityName}-${entityValue}-${createCompoundAnomalyKey(
                        anomalyBy.anomaly
                      )}`}
                      entityName={entityName}
                      entityValue={entityValue}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            );
          })}
      </EuiFlexGroup>
    ),
  },
  {
    name: i18n.TIME_STAMP,
    field: 'anomaly.time',
    sortable: true,
    render: (time) => <FormattedRelativePreferenceDate value={time} />,
  },
];
