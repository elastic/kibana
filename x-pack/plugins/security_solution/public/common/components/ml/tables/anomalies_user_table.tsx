/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';

import { useDispatch } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useAnomaliesTableData } from '../anomaly/use_anomalies_table_data';
import { HeaderSection } from '../../header_section';

import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import * as i18n from './translations';

import { Loader } from '../../loader';
import type { AnomaliesUserTableProps } from '../types';
import { useMlCapabilities } from '../hooks/use_ml_capabilities';
import { BasicTable } from './basic_table';

import { getCriteriaFromUsersType } from '../criteria/get_criteria_from_users_type';
import { Panel } from '../../panel';
import { convertAnomaliesToUsers } from './convert_anomalies_to_users';
import { getAnomaliesUserTableColumnsCurated } from './get_anomalies_user_table_columns';
import { useQueryToggle } from '../../../containers/query_toggle';
import { JobIdFilter } from './job_id_filter';
import { SelectInterval } from './select_interval';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { usersActions, usersSelectors } from '../../../../explore/users/store';
import type { State } from '../../../store/types';
import { useInstalledSecurityJobNameById } from '../hooks/use_installed_security_jobs';

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
  const dispatch = useDispatch();
  const capabilities = useMlCapabilities();

  const { toggleStatus, setToggleStatus } = useQueryToggle(`AnomaliesUserTable`);
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

  const { jobNameById, loading: loadingJobs } = useInstalledSecurityJobNameById();
  const jobIds = useMemo(() => Object.keys(jobNameById), [jobNameById]);

  const getAnomaliesUserTableFilterQuerySelector = useMemo(
    () => usersSelectors.usersAnomaliesJobIdFilterSelector(),
    []
  );

  const selectedJobIds = useDeepEqualSelector((state: State) =>
    getAnomaliesUserTableFilterQuerySelector(state, type)
  );

  const onSelectJobId = useCallback(
    (newSelection: string[]) => {
      dispatch(
        usersActions.updateUsersAnomaliesJobIdFilter({
          jobIds: newSelection,
          usersType: type,
        })
      );
    },
    [dispatch, type]
  );

  const getAnomaliesUserTableIntervalQuerySelector = useMemo(
    () => usersSelectors.usersAnomaliesIntervalSelector(),
    []
  );

  const selectedInterval = useDeepEqualSelector((state: State) =>
    getAnomaliesUserTableIntervalQuerySelector(state, type)
  );

  const onSelectInterval = useCallback(
    (newInterval: string) => {
      dispatch(
        usersActions.updateUsersAnomaliesInterval({
          interval: newInterval,
          usersType: type,
        })
      );
    },
    [dispatch, type]
  );

  const [loadingTable, tableData] = useAnomaliesTableData({
    startDate,
    endDate,
    skip: querySkip,
    criteriaFields: getCriteriaFromUsersType(type, userName),
    filterQuery: {
      exists: { field: 'user.name' },
    },
    jobIds: selectedJobIds.length > 0 ? selectedJobIds : jobIds,
    aggregationInterval: selectedInterval,
  });

  const users = convertAnomaliesToUsers(tableData, jobNameById, userName);
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
      <Panel loading={loadingTable || loadingJobs} data-test-subj="user-anomalies-tab">
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
                  jobNameById={jobNameById}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />

        {toggleStatus && (
          <BasicTable
            data-test-subj="user-anomalies-table"
            // @ts-expect-error the Columns<T, U> type is not as specific as EUI's...
            columns={columns}
            items={users}
            pagination={pagination}
            sorting={sorting}
          />
        )}

        {(loadingTable || loadingJobs) && (
          <Loader data-test-subj="anomalies-user-table-loading-panel" overlay size="xl" />
        )}
      </Panel>
    );
  }
};

export const AnomaliesUserTable = React.memo(AnomaliesUserTableComponent);
