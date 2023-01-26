/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Columns } from '../../../../explore/components/paginated_table';
import type { AnomaliesByHost, Anomaly } from '../types';
import { getRowItemsWithActions } from '../../tables/helpers';
import { createCompoundAnomalyKey } from './create_compound_key';
import { HostDetailsLink } from '../../links';
import * as i18n from './translations';
import { HostsType } from '../../../../explore/hosts/store/model';
import { getAnomaliesDefaultTableColumns } from './get_anomalies_table_columns';

export const getAnomaliesHostTableColumns = (
  startDate: string,
  endDate: string
): [
  Columns<AnomaliesByHost['hostName'], AnomaliesByHost>,
  Columns<Anomaly['severity'], AnomaliesByHost>,
  Columns<Anomaly['jobId'], AnomaliesByHost>,
  Columns<Anomaly['entityValue'], AnomaliesByHost>,
  Columns<Anomaly['influencers'], AnomaliesByHost>,
  Columns<Anomaly['time'], AnomaliesByHost>
] => [
  {
    name: i18n.HOST_NAME,
    field: 'hostName',
    sortable: true,
    render: (hostName, anomaliesByHost) =>
      getRowItemsWithActions({
        values: [hostName],
        fieldName: 'host.name',
        idPrefix: `anomalies-host-table-hostName-${createCompoundAnomalyKey(
          anomaliesByHost.anomaly
        )}-hostName`,
        fieldType: 'keyword',
        render: (item) => <HostDetailsLink hostName={item} />,
      }),
  },
  ...getAnomaliesDefaultTableColumns(startDate, endDate),
];

export const getAnomaliesHostTableColumnsCurated = (
  pageType: HostsType,
  startDate: string,
  endDate: string
) => {
  const columns = getAnomaliesHostTableColumns(startDate, endDate);

  // Columns to exclude from host details pages
  if (pageType === HostsType.details) {
    return columns.filter((column) => column.name !== i18n.HOST_NAME);
  } else {
    return columns;
  }
};
