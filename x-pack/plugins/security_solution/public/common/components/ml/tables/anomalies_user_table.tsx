/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useAnomaliesTableData } from '../anomaly/use_anomalies_table_data';
import { HeaderSection } from '../../header_section';

import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import * as i18n from './translations';

import { Loader } from '../../loader';
import { AnomaliesUserTableProps } from '../types';
import { useMlCapabilities } from '../hooks/use_ml_capabilities';
import { BasicTable } from './basic_table';

import { getCriteriaFromUsersType } from '../criteria/get_criteria_from_users_type';
import { Panel } from '../../panel';
import { anomaliesTableDefaultEquality } from './default_equality';
import { convertAnomaliesToUsers } from './convert_anomalies_to_users';
import { getAnomaliesUserTableColumnsCurated } from './get_anomalies_user_table_columns';

const sorting = {
  sort: {
    field: 'anomaly.severity',
    direction: 'desc',
  },
} as const;

const AnomaliesUserTableComponent: React.FC<AnomaliesUserTableProps> = ({
  startDate,
  endDate,
  userName,
  skip,
  type,
}) => {
  const capabilities = useMlCapabilities();

  const [loading, tableData] = useAnomaliesTableData({
    startDate,
    endDate,
    skip,
    criteriaFields: getCriteriaFromUsersType(type, userName),
    filterQuery: {
      exists: { field: 'user.name' },
    },
  });

  const users = convertAnomaliesToUsers(tableData, userName);

  const columns = getAnomaliesUserTableColumnsCurated(type, startDate, endDate);
  const pagination = {
    initialPageIndex: 0,
    initialPageSize: 10,
    totalItemCount: users.length,
    pageSizeOptions: [5, 10, 20, 50],
    showPerPageOptions: true,
  };

  if (!hasMlUserPermissions(capabilities)) {
    return null;
  } else {
    return (
      <Panel loading={loading} data-test-subj="user-anomalies-tab">
        <HeaderSection
          subtitle={`${i18n.SHOWING}: ${pagination.totalItemCount.toLocaleString()} ${i18n.UNIT(
            pagination.totalItemCount
          )}`}
          title={i18n.ANOMALIES}
          tooltip={i18n.TOOLTIP}
          isInspectDisabled={skip}
        />

        <BasicTable
          // @ts-expect-error the Columns<T, U> type is not as specific as EUI's...
          columns={columns}
          items={users}
          pagination={pagination}
          sorting={sorting}
        />

        {loading && (
          <Loader data-test-subj="anomalies-host-table-loading-panel" overlay size="xl" />
        )}
      </Panel>
    );
  }
};

export const AnomaliesUserTable = React.memo(
  AnomaliesUserTableComponent,
  anomaliesTableDefaultEquality
);
