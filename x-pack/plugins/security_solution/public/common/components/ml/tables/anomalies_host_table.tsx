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
import { getAnomaliesHostTableColumnsCurated } from './get_anomalies_host_table_columns';
import { convertAnomaliesToHosts } from './convert_anomalies_to_hosts';
import { Loader } from '../../loader';
import { AnomaliesHostTableProps } from '../types';
import { useMlCapabilities } from '../hooks/use_ml_capabilities';
import { BasicTable } from './basic_table';
import { getCriteriaFromHostType } from '../criteria/get_criteria_from_host_type';
import { Panel } from '../../panel';
import { anomaliesTableDefaultEquality } from './default_equality';

const sorting = {
  sort: {
    field: 'anomaly.severity',
    direction: 'desc',
  },
} as const;

const AnomaliesHostTableComponent: React.FC<AnomaliesHostTableProps> = ({
  startDate,
  endDate,
  hostName,
  skip,
  type,
}) => {
  const capabilities = useMlCapabilities();
  const [loading, tableData] = useAnomaliesTableData({
    startDate,
    endDate,
    skip,
    criteriaFields: getCriteriaFromHostType(type, hostName),
    filterQuery: {
      exists: { field: 'host.name' },
    },
  });

  const hosts = convertAnomaliesToHosts(tableData, hostName);

  const columns = getAnomaliesHostTableColumnsCurated(type, startDate, endDate);
  const pagination = {
    initialPageIndex: 0,
    initialPageSize: 10,
    totalItemCount: hosts.length,
    pageSizeOptions: [5, 10, 20, 50],
    showPerPageOptions: true,
  };

  if (!hasMlUserPermissions(capabilities)) {
    return null;
  } else {
    return (
      <Panel loading={loading}>
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
          items={hosts}
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

export const AnomaliesHostTable = React.memo(
  AnomaliesHostTableComponent,
  anomaliesTableDefaultEquality
);
