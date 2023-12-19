/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FindingsBaseProps } from '../../common/types';
import { CloudSecurityDataTable } from '../../components/cloud_security_data_table';
import { useLatestVulnerabilitiesTable } from './hooks/use_latest_vulnerabilities_table';
import { LATEST_VULNERABILITIES_TABLE } from './test_subjects';
import { getDefaultQuery } from './constants';

type LatestVulnerabilitiesTableProps = FindingsBaseProps & {
  groupSelectorComponent?: JSX.Element;
  height?: number;
};

export const LatestVulnerabilitiesTable = ({ dataView }: LatestVulnerabilitiesTableProps) => {
  const { cloudPostureTable, rows, error, isFetching, fetchNextPage } =
    useLatestVulnerabilitiesTable({
      dataView,
      getDefaultQuery,
    });

  return (
    <CloudSecurityDataTable
      data-test-subj={LATEST_VULNERABILITIES_TABLE}
      dataView={dataView}
      isLoading={isFetching}
      defaultColumns={defaultColumns}
      rows={rows}
      total={total}
      flyoutComponent={flyoutComponent}
      cloudPostureTable={cloudPostureTable}
      loadMore={fetchNextPage}
      title={title}
      customCellRenderer={customCellRenderer}
      groupSelectorComponent={groupSelectorComponent}
      height={height}
    />
  );
};
