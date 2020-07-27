/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useAnomaliesTableData } from '../anomaly/use_anomalies_table_data';
import { HeaderSection } from '../../header_section';

import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import * as i18n from './translations';
import { getAnomaliesHostTableColumnsCurated } from './get_anomalies_host_table_columns';
import { convertAnomaliesToHosts } from './convert_anomalies_to_hosts';
import { Loader } from '../../loader';
import { getIntervalFromAnomalies } from '../anomaly/get_interval_from_anomalies';
import { AnomaliesHostTableProps } from '../types';
import { useMlCapabilities } from '../../ml_popover/hooks/use_ml_capabilities';
import { BasicTable } from './basic_table';
import { hostEquality } from './host_equality';
import { getCriteriaFromHostType } from '../criteria/get_criteria_from_host_type';
import { Panel } from '../../panel';

const sorting = {
  sort: {
    field: 'anomaly.severity',
    direction: 'desc',
  },
} as const;

const AnomaliesHostTableComponent: React.FC<AnomaliesHostTableProps> = ({
  startDate,
  endDate,
  narrowDateRange,
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
  });

  const hosts = convertAnomaliesToHosts(tableData, hostName);

  const interval = getIntervalFromAnomalies(tableData);
  const columns = getAnomaliesHostTableColumnsCurated(
    type,
    startDate,
    endDate,
    interval,
    narrowDateRange
  );
  const pagination = {
    initialPageIndex: 0,
    initialPageSize: 10,
    totalItemCount: hosts.length,
    pageSizeOptions: [5, 10, 20, 50],
    hidePerPageOptions: false,
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
        />

        <BasicTable
          // @ts-ignore the Columns<T, U> type is not as specific as EUI's...
          columns={columns}
          // @ts-ignore ...which leads to `networks` not "matching" the columns
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

export const AnomaliesHostTable = React.memo(AnomaliesHostTableComponent, hostEquality);
