/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Columns } from '../../paginated_table';
import { AnomaliesByUser, Anomaly } from '../types';
import { getRowItemDraggable } from '../../tables/helpers';
import { createCompoundAnomalyKey } from './create_compound_key';
import { UserDetailsLink } from '../../links';

import * as i18n from './translations';
import { UsersType } from '../../../../users/store/model';
import { getAnomaliesDefaultTableColumns } from './get_anomalies_table_columns';

export const getAnomaliesUserTableColumns = (
  startDate: string,
  endDate: string
): [
  Columns<AnomaliesByUser['userName'], AnomaliesByUser>,
  Columns<Anomaly['severity'], AnomaliesByUser>,
  Columns<Anomaly['jobId'], AnomaliesByUser>,
  Columns<Anomaly['entityValue'], AnomaliesByUser>,
  Columns<Anomaly['influencers'], AnomaliesByUser>,
  Columns<Anomaly['time'], AnomaliesByUser>
] => [
  {
    name: i18n.USER_NAME,
    field: 'userName',
    sortable: true,
    render: (userName, anomaliesByUser) =>
      getRowItemDraggable({
        rowItem: userName,
        attrName: 'user.name',
        idPrefix: `anomalies-user-table-userName-${createCompoundAnomalyKey(
          anomaliesByUser.anomaly
        )}-userName`,
        render: (item) => <UserDetailsLink userName={item} />,
      }),
  },
  ...getAnomaliesDefaultTableColumns(startDate, endDate),
];

export const getAnomaliesUserTableColumnsCurated = (
  pageType: UsersType,
  startDate: string,
  endDate: string
) => {
  const columns = getAnomaliesUserTableColumns(startDate, endDate);

  // Columns to exclude from user details pages
  if (pageType === UsersType.details) {
    return columns.filter((column) => column.name !== i18n.USER_NAME);
  } else {
    return columns;
  }
};
