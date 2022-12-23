/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import {
  Criteria,
  EuiBasicTable,
  EuiTableSortingType,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IHttpSerializedFetchError } from '../../../../state/utils/http_error';
import { MonitorListPageState } from '../../../../state';
import { useCanEditSynthetics } from '../../../../../../hooks/use_capabilities';
import {
  ConfigKey,
  Ping,
  EncryptedSyntheticsSavedMonitor,
  OverviewStatusState,
} from '../../../../../../../common/runtime_types';
import { SyntheticsSettingsContext } from '../../../../contexts/synthetics_settings_context';
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
  errorSummaries?: Ping[];
  status: OverviewStatusState | null;
}

export const MonitorList = ({
  pageState: { pageIndex, pageSize, sortField, sortOrder },
  syntheticsMonitors,
  total,
  error,
  loading,
  status,
  loadPage,
  reloadPage,
  errorSummaries,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const { basePath } = useContext(SyntheticsSettingsContext);
  const isXl = useIsWithinMinBreakpoint('xxl');
  const canEditSynthetics = useCanEditSynthetics();

  const errorSummariesById = useMemo(
    () =>
      (errorSummaries ?? []).reduce((acc, cur) => {
        if (cur.config_id) {
          acc.set(cur.config_id, cur);
        }
        return acc;
      }, new Map<string, Ping>()),
    [errorSummaries]
  );

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
        sortField: field === 'enabled' ? field : `${field}.keyword`,
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
      field: sortField.replace('.keyword', '') as keyof EncryptedSyntheticsSavedMonitor,
      direction: sortOrder,
    },
  };

  const recordRangeLabel = labels.getRecordRangeLabel({
    rangeStart: total === 0 ? 0 : pageSize * pageIndex + 1,
    rangeEnd: pageSize * pageIndex + pageSize,
    total,
  });

  const columns = useMonitorListColumns({
    basePath,
    euiTheme,
    errorSummaries,
    errorSummariesById,
    canEditSynthetics,
    syntheticsMonitors,
    loading,
    reloadPage,
    status,
  });

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      {recordRangeLabel}
      <EuiSpacer size="s" />
      <hr style={{ border: `1px solid ${euiTheme.colors.lightShade}` }} />
      <EuiBasicTable
        aria-label={i18n.translate('xpack.synthetics.management.monitorList.title', {
          defaultMessage: 'Synthetics monitors list',
        })}
        error={error?.body?.message}
        loading={loading}
        isExpandable={true}
        hasActions={true}
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
  );
};
