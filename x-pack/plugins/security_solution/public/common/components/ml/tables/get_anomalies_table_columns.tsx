/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Columns } from '../../../../explore/components/paginated_table';
import type { AnomaliesBy, Anomaly } from '../types';

import { Entity } from '../entity';
import { createCompoundAnomalyKey } from './create_compound_key';

import * as i18n from './translations';
import { getEntries } from '../get_entries';
import { Score } from '../score/score';
import { ExplorerLink } from '../links/create_explorer_link';
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
    field: 'jobName',
    sortable: true,
    render: (jobName, anomalyBy) => (
      <ExplorerLink
        score={anomalyBy.anomaly}
        startDate={startDate}
        endDate={endDate}
        linkName={jobName}
      />
    ),
  },
  {
    name: i18n.SCORE,
    field: 'anomaly.severity',
    sortable: true,
    render: (_, anomalyBy) => <Score score={anomalyBy.anomaly} />,
  },
  {
    name: i18n.ENTITY,
    field: 'anomaly.entityValue',
    sortable: true,
    render: (entityValue, anomalyBy) => (
      <Entity entityName={anomalyBy.anomaly.entityName} entityValue={entityValue} />
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
                    <Entity entityName={entityName} entityValue={entityValue} />
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
