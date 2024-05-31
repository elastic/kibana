/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  Criteria,
  EuiBasicTable,
  EuiTableSortingType,
  EuiPanel,
  EuiHorizontalRule,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MonitorListSortField } from '../../../../../../../common/runtime_types/monitor_management/sort_field';
import { DeleteMonitor } from './delete_monitor';
import { IHttpSerializedFetchError } from '../../../../state/utils/http_error';
import { MonitorListPageState } from '../../../../state';
import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
  OverviewStatusState,
  SourceType,
} from '../../../../../../../common/runtime_types';
import { useMonitorListColumns } from './columns';
import * as labels from './labels';

interface Props {
  pageState: MonitorListPageState;
  syntheticsMonitors: EncryptedSyntheticsSavedMonitor[];
  total: number;
  error: IHttpSerializedFetchError | null;
  loading: boolean;
  loadPage: (state: MonitorListPageState) => void;
  reloadPage: () => void;
  overviewStatus: OverviewStatusState | null;
}

export const MonitorList = ({
  pageState: { pageIndex, pageSize, sortField, sortOrder },
  syntheticsMonitors,
  total,
  error,
  loading,
  overviewStatus,
  loadPage,
  reloadPage,
}: Props) => {
  const isXl = useIsWithinMinBreakpoint('xxl');

  const [monitorPendingDeletion, setMonitorPendingDeletion] =
    useState<EncryptedSyntheticsSavedMonitor | null>(null);

  const handleOnChange = useCallback(
    ({
      page = { index: 0, size: 10 },
      sort = { field: ConfigKey.NAME, direction: 'asc' },
    }: Criteria<EncryptedSyntheticsSavedMonitor>) => {
      const { index, size } = page;
      const { field, direction } = sort;

      loadPage({
        pageIndex: index,
        pageSize: size,
        sortField: (field === 'enabled' ? field : `${field}.keyword`) as MonitorListSortField,
        sortOrder: direction,
      });
    },
    [loadPage]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: total,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  const sorting: EuiTableSortingType<EncryptedSyntheticsSavedMonitor> = {
    sort: {
      field: sortField?.replace('.keyword', '') as keyof EncryptedSyntheticsSavedMonitor,
      direction: sortOrder,
    },
  };

  const recordRangeLabel = labels.getRecordRangeLabel({
    rangeStart: total === 0 ? 0 : pageSize * pageIndex + 1,
    rangeEnd: pageSize * pageIndex + pageSize,
    total,
  });

  const columns = useMonitorListColumns({
    loading,
    overviewStatus,
    setMonitorPendingDeletion,
  });

  return (
    <>
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        {recordRangeLabel}
        <EuiHorizontalRule margin="s" />
        <EuiBasicTable
          aria-label={i18n.translate('xpack.synthetics.management.monitorList.title', {
            defaultMessage: 'Synthetics monitors list',
          })}
          error={error?.body?.message}
          loading={loading}
          itemId="monitor_id"
          items={syntheticsMonitors}
          columns={columns}
          tableLayout={isXl ? 'auto' : 'fixed'}
          pagination={pagination}
          sorting={sorting}
          onChange={handleOnChange}
          noItemsMessage={loading ? labels.LOADING : labels.NO_DATA_MESSAGE}
        />
      </EuiPanel>
      {monitorPendingDeletion && (
        <DeleteMonitor
          configId={monitorPendingDeletion[ConfigKey.CONFIG_ID]}
          name={monitorPendingDeletion[ConfigKey.NAME] ?? ''}
          setMonitorPendingDeletion={setMonitorPendingDeletion}
          isProjectMonitor={
            monitorPendingDeletion[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT
          }
          reloadPage={reloadPage}
        />
      )}
    </>
  );
};
