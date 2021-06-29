/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Columns } from '../../paginated_table';
import { Anomaly, AnomaliesByNetwork } from '../types';
import { getRowItemDraggable } from '../../tables/helpers';
import { EntityDraggable } from '../entity_draggable';
import { createCompoundNetworkKey } from './create_compound_key';
import { NetworkDetailsLink } from '../../links';

import * as i18n from './translations';
import { getEntries } from '../get_entries';
import { DraggableScore } from '../score/draggable_score';
import { ExplorerLink } from '../links/create_explorer_link';
import { FormattedRelativePreferenceDate } from '../../formatted_date';
import { NetworkType } from '../../../../network/store/model';
import { escapeDataProviderId } from '../../drag_and_drop/helpers';
import { FlowTarget } from '../../../../../common/search_strategy';

export const getAnomaliesNetworkTableColumns = (
  startDate: string,
  endDate: string,
  flowTarget?: FlowTarget
): [
  Columns<AnomaliesByNetwork['ip'], AnomaliesByNetwork>,
  Columns<Anomaly['severity'], AnomaliesByNetwork>,
  Columns<Anomaly['jobId'], AnomaliesByNetwork>,
  Columns<Anomaly['entityValue'], AnomaliesByNetwork>,
  Columns<Anomaly['influencers'], AnomaliesByNetwork>,
  Columns<Anomaly['time'], AnomaliesByNetwork>
] => [
  {
    name: i18n.NETWORK_NAME,
    field: 'ip',
    sortable: true,
    render: (ip, anomaliesByNetwork) =>
      getRowItemDraggable({
        rowItem: ip,
        attrName: anomaliesByNetwork.type,
        idPrefix: `anomalies-network-table-ip-${createCompoundNetworkKey(anomaliesByNetwork)}`,
        render: (item) => <NetworkDetailsLink ip={item} flowTarget={flowTarget} />,
      }),
  },
  {
    name: i18n.DETECTOR,
    field: 'anomaly.jobId',
    sortable: true,
    render: (jobId, anomaliesByHost) => (
      <ExplorerLink
        score={anomaliesByHost.anomaly}
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
    render: (_, anomaliesByNetwork) => (
      <DraggableScore
        id={escapeDataProviderId(
          `anomalies-network-table-severity-${createCompoundNetworkKey(anomaliesByNetwork)}`
        )}
        score={anomaliesByNetwork.anomaly}
      />
    ),
  },
  {
    name: i18n.ENTITY,
    field: 'anomaly.entityValue',
    sortable: true,
    render: (entityValue, anomaliesByNetwork) => (
      <EntityDraggable
        idPrefix={`anomalies-network-table-entityValue-${createCompoundNetworkKey(
          anomaliesByNetwork
        )}`}
        entityName={anomaliesByNetwork.anomaly.entityName}
        entityValue={entityValue}
      />
    ),
  },
  {
    name: i18n.INFLUENCED_BY,
    field: 'anomaly.influencers',
    render: (influencers, anomaliesByNetwork) => (
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        {influencers &&
          influencers.map((influencer) => {
            const [key, value] = getEntries(influencer);
            const entityName = key != null ? key : '';
            const entityValue = value != null ? value : '';
            return (
              <EuiFlexItem
                key={`${entityName}-${entityValue}-${createCompoundNetworkKey(anomaliesByNetwork)}`}
                grow={false}
              >
                <EntityDraggable
                  idPrefix={`anomalies-network-table-influencers-${entityName}-${entityValue}-${createCompoundNetworkKey(
                    anomaliesByNetwork
                  )}`}
                  entityName={entityName}
                  entityValue={entityValue}
                />
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

export const getAnomaliesNetworkTableColumnsCurated = (
  pageType: NetworkType,
  startDate: string,
  endDate: string,
  flowTarget?: FlowTarget
) => {
  const columns = getAnomaliesNetworkTableColumns(startDate, endDate, flowTarget);

  // Columns to exclude from ip details pages
  if (pageType === NetworkType.details) {
    return columns.filter((column) => column.name !== i18n.NETWORK_NAME);
  } else {
    return columns;
  }
};
