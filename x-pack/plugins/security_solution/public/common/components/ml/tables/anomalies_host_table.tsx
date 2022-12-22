/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatch } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useAnomaliesTableData } from '../anomaly/use_anomalies_table_data';
import { HeaderSection } from '../../header_section';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import * as i18n from './translations';
import { getAnomaliesHostTableColumnsCurated } from './get_anomalies_host_table_columns';
import { convertAnomaliesToHosts } from './convert_anomalies_to_hosts';
import { Loader } from '../../loader';
import type { AnomaliesHostTableProps } from '../types';
import { useMlCapabilities } from '../hooks/use_ml_capabilities';
import { BasicTable } from './basic_table';
import { getCriteriaFromHostType } from '../criteria/get_criteria_from_host_type';
import { Panel } from '../../panel';
import { useQueryToggle } from '../../../containers/query_toggle';
import { useInstalledSecurityJobsIds } from '../hooks/use_installed_security_jobs';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import type { State } from '../../../store';
import { JobIdFilter } from './job_id_filter';
import { SelectInterval } from './select_interval';
import { hostsActions, hostsSelectors } from '../../../../explore/hosts/store';

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
  const dispatch = useDispatch();
  const capabilities = useMlCapabilities();
  const { toggleStatus, setToggleStatus } = useQueryToggle(`AnomaliesHostTable`);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const toggleQuery = useCallback(
    (status: boolean) => {
      setToggleStatus(status);
      // toggle on = skipQuery false
      setQuerySkip(!status);
    },
    [setQuerySkip, setToggleStatus]
  );

  const { jobIds, loading: loadingJobs } = useInstalledSecurityJobsIds();

  const getAnomaliesHostsTableFilterQuerySelector = useMemo(
    () => hostsSelectors.hostsAnomaliesJobIdFilterSelector(),
    []
  );

  const selectedJobIds = useDeepEqualSelector((state: State) =>
    getAnomaliesHostsTableFilterQuerySelector(state, type)
  );

  const onSelectJobId = useCallback(
    (newSelection: string[]) => {
      dispatch(
        hostsActions.updateHostsAnomaliesJobIdFilter({
          jobIds: newSelection,
          hostsType: type,
        })
      );
    },
    [dispatch, type]
  );

  const getAnomaliesHostTableIntervalQuerySelector = useMemo(
    () => hostsSelectors.hostsAnomaliesIntervalSelector(),
    []
  );

  const selectedInterval = useDeepEqualSelector((state: State) =>
    getAnomaliesHostTableIntervalQuerySelector(state, type)
  );

  const onSelectInterval = useCallback(
    (newInterval: string) => {
      dispatch(
        hostsActions.updateHostsAnomaliesInterval({
          interval: newInterval,
          hostsType: type,
        })
      );
    },
    [dispatch, type]
  );

  const [loadingTable, tableData] = useAnomaliesTableData({
    startDate,
    endDate,
    skip: querySkip,
    criteriaFields: getCriteriaFromHostType(type, hostName),
    filterQuery: {
      exists: { field: 'host.name' },
    },
    jobIds: selectedJobIds.length > 0 ? selectedJobIds : jobIds,
    aggregationInterval: selectedInterval,
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
      <Panel loading={loadingTable || loadingJobs}>
        <HeaderSection
          subtitle={`${i18n.SHOWING}: ${pagination.totalItemCount.toLocaleString()} ${i18n.UNIT(
            pagination.totalItemCount
          )}`}
          title={i18n.ANOMALIES}
          toggleQuery={toggleQuery}
          toggleStatus={toggleStatus}
          tooltip={i18n.TOOLTIP}
          isInspectDisabled={skip}
          headerFilters={
            <EuiFlexGroup>
              <EuiFlexItem>
                <SelectInterval interval={selectedInterval} onChange={onSelectInterval} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <JobIdFilter
                  title={i18n.JOB_ID}
                  onSelect={onSelectJobId}
                  selectedJobIds={selectedJobIds}
                  jobIds={jobIds}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
        {toggleStatus && (
          <BasicTable
            data-test-subj="host-anomalies-table"
            // @ts-expect-error the Columns<T, U> type is not as specific as EUI's...
            columns={columns}
            items={hosts}
            pagination={pagination}
            sorting={sorting}
          />
        )}

        {(loadingTable || loadingJobs) && (
          <Loader data-test-subj="anomalies-host-table-loading-panel" overlay size="xl" />
        )}
      </Panel>
    );
  }
};

export const AnomaliesHostTable = React.memo(AnomaliesHostTableComponent);
