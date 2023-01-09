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
import { convertAnomaliesToNetwork } from './convert_anomalies_to_network';
import { Loader } from '../../loader';
import type { AnomaliesNetworkTableProps } from '../types';
import { getAnomaliesNetworkTableColumnsCurated } from './get_anomalies_network_table_columns';
import { useMlCapabilities } from '../hooks/use_ml_capabilities';
import { BasicTable } from './basic_table';
import { getCriteriaFromNetworkType } from '../criteria/get_criteria_from_network_type';
import { Panel } from '../../panel';
import { useQueryToggle } from '../../../containers/query_toggle';
import { useInstalledSecurityJobsNamesById } from '../hooks/use_installed_security_jobs';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import type { State } from '../../../store';
import { JobIdFilter } from './job_id_filter';
import { networkActions, networkSelectors } from '../../../../explore/network/store';
import { SelectInterval } from './select_interval';

const sorting = {
  sort: {
    field: 'anomaly.severity',
    direction: 'desc',
  },
} as const;

const AnomaliesNetworkTableComponent: React.FC<AnomaliesNetworkTableProps> = ({
  startDate,
  endDate,
  skip,
  ip,
  type,
  flowTarget,
}) => {
  const capabilities = useMlCapabilities();
  const dispatch = useDispatch();
  const { toggleStatus, setToggleStatus } = useQueryToggle(`AnomaliesNetwork-${flowTarget}`);
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

  const { jobNameById, loading: loadingJobs } = useInstalledSecurityJobsNamesById();
  const jobIds = useMemo(() => Object.keys(jobNameById), [jobNameById]);

  const getAnomaliesUserTableFilterQuerySelector = useMemo(
    () => networkSelectors.networkAnomaliesJobIdFilterSelector(),
    []
  );

  const selectedJobIds = useDeepEqualSelector((state: State) =>
    getAnomaliesUserTableFilterQuerySelector(state, type)
  );

  const onSelectJobId = useCallback(
    (newSelection: string[]) => {
      dispatch(
        networkActions.updateNetworkAnomaliesJobIdFilter({
          jobIds: newSelection,
          networkType: type,
        })
      );
    },
    [dispatch, type]
  );

  const getAnomaliesNetworkTableIntervalQuerySelector = useMemo(
    () => networkSelectors.networkAnomaliesIntervalSelector(),
    []
  );

  const selectedInterval = useDeepEqualSelector((state: State) =>
    getAnomaliesNetworkTableIntervalQuerySelector(state, type)
  );

  const onSelectInterval = useCallback(
    (newInterval: string) => {
      dispatch(
        networkActions.updateNetworkAnomaliesInterval({
          interval: newInterval,
          networkType: type,
        })
      );
    },
    [dispatch, type]
  );

  const [loadingTable, tableData] = useAnomaliesTableData({
    startDate,
    endDate,
    skip: querySkip,
    criteriaFields: getCriteriaFromNetworkType(type, ip, flowTarget),
    jobIds: selectedJobIds.length > 0 ? selectedJobIds : jobIds,
    aggregationInterval: selectedInterval,
  });

  const networks = convertAnomaliesToNetwork(tableData, jobNameById, ip);
  const columns = getAnomaliesNetworkTableColumnsCurated(type, startDate, endDate, flowTarget);
  const pagination = {
    initialPageIndex: 0,
    initialPageSize: 10,
    totalItemCount: networks.length,
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
          tooltip={i18n.TOOLTIP}
          toggleQuery={toggleQuery}
          toggleStatus={toggleStatus}
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
                  jobNameById={jobNameById}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
        {toggleStatus && (
          <BasicTable
            data-test-subj="network-anomalies-table"
            // @ts-expect-error the Columns<T, U> type is not as specific as EUI's...
            columns={columns}
            items={networks}
            pagination={pagination}
            sorting={sorting}
          />
        )}

        {(loadingTable || loadingJobs) && (
          <Loader data-test-subj="anomalies-network-table-loading-panel" overlay size="xl" />
        )}
      </Panel>
    );
  }
};

export const AnomaliesNetworkTable = React.memo(AnomaliesNetworkTableComponent);
