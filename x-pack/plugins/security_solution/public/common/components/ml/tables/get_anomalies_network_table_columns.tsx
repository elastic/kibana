/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Columns } from '../../paginated_table';
import { Anomaly, AnomaliesByNetwork } from '../types';
import { getRowItemDraggable } from '../../tables/helpers';
import { createCompoundAnomalyKey } from './create_compound_key';
import { NetworkDetailsLink } from '../../links';

import * as i18n from './translations';
import { NetworkType } from '../../../../network/store/model';
import { FlowTarget } from '../../../../../common/search_strategy';
import { getAnomaliesDefaultTableColumns } from './get_anomalies_table_columns';

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
        idPrefix: `anomalies-network-table-ip-${createCompoundAnomalyKey(
          anomaliesByNetwork.anomaly
        )}`,
        render: (item) => <NetworkDetailsLink ip={item} flowTarget={flowTarget} />,
      }),
  },
  ...getAnomaliesDefaultTableColumns(startDate, endDate),
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
