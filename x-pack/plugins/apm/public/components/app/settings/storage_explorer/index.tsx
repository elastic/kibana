/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  euiPaletteColorBlind,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  PartitionLayout,
  Chart,
  Partition,
  Datum,
  Settings,
} from '@elastic/charts';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';

import { EnvironmentBadge } from '../../../shared/environment_badge';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { StorageExplorerItem } from '../../../../../common/storage_explorer_types';
import { asDynamicBytes } from '../../../../../common/utils/formatters';
import { asPercent } from '../../../../../common/utils/formatters';
import { useChartTheme } from '../../../../../../observability/public';

export function StorageExplorer() {
  const rangeFrom = 'now/d';
  const rangeTo = 'now/d';
  const environment = ENVIRONMENT_ALL.value;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const chartTheme = useChartTheme();
  const groupedPalette = euiPaletteColorBlind({
    rotations: 3,
    order: 'group',
    sortBy: 'natural',
  });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/storage_explorer', {
          params: {
            query: {
              start,
              end,
              environment,
            },
          },
        });
      }
    },
    [start, end, environment]
  );

  const items: StorageExplorerItem[] = data?.serviceStats ?? [];

  const columns: Array<EuiBasicTableColumn<StorageExplorerItem>> = [
    {
      field: 'service',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.serviceColumnName',
        {
          defaultMessage: 'Service',
        }
      ),
      sortable: true,
    },
    {
      field: 'environment',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.environmentColumnName',
        {
          defaultMessage: 'Environment',
        }
      ),
      render: (test, { environments }) => (
        <EnvironmentBadge environments={environments ?? []} />
      ),
      sortable: true,
    },
    {
      field: 'size',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.sizeColumnName',
        {
          defaultMessage: 'Size',
        }
      ),
      render: asDynamicBytes,
      sortable: true,
    },
    {
      field: 'calls',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.callsColumnName',
        {
          defaultMessage: 'Calls',
        }
      ),
      sortable: true,
    },
    {
      field: 'sampling',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.samplingColumnName',
        {
          defaultMessage: 'Sampling',
        }
      ),
      render: (value: string) => asPercent(parseFloat(value), 1),
      sortable: true,
    },
    {
      field: 'transaction',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.transactionsColumnName',
        {
          defaultMessage: 'Transactions',
        }
      ),
      sortable: true,
    },
    {
      field: 'span',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.spansColumnName',
        {
          defaultMessage: 'Spans',
        }
      ),
      sortable: true,
    },
    {
      field: 'error',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.errorsColumnName',
        {
          defaultMessage: 'Errors',
        }
      ),
      sortable: true,
    },
    {
      field: 'metric',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.metricsColumnName',
        {
          defaultMessage: 'Metrics',
        }
      ),
      sortable: true,
    },
  ];

  const search = {
    box: {
      incremental: true,
    },
  };

  const loading =
    status === FETCH_STATUS.NOT_INITIATED || status === FETCH_STATUS.LOADING;

  const requestFailed = status === FETCH_STATUS.FAILURE;

  if (loading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="xl" />}
        titleSize="xs"
        title={
          <h2>
            {i18n.translate(
              'xpack.apm.settings.storageExplorer.loadingPromptTitle',
              {
                defaultMessage: 'Loading storage explorer...',
              }
            )}
          </h2>
        }
      />
    );
  }

  if (requestFailed) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            {i18n.translate(
              'xpack.apm.settings.storageExplorer.errorPromptTitle',
              {
                defaultMessage: 'Could not load storage explorer.',
              }
            )}
          </h2>
        }
      />
    );
  }

  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.apm.settings.storageExplorer.title', {
            defaultMessage: 'Storage explorer',
          })}
        </h2>
      </EuiTitle>

      <Chart size={{ height: 240 }}>
        <Settings theme={chartTheme} showLegend legendMaxDepth={1} />
        <Partition
          id="treemap"
          data={items}
          layout={PartitionLayout.treemap}
          valueAccessor={(d) => parseInt(d.size, 10)}
          valueGetter="percent"
          topGroove={0}
          layers={[
            {
              groupByRollup: (d: Datum) => d.service,
              shape: {
                fillColor: (d) =>
                  groupedPalette[d.parent.sortIndex * 3 + d.sortIndex],
              },
            },
          ]}
        />
      </Chart>
      <EuiSpacer size="m" />

      <EuiInMemoryTable
        tableCaption={i18n.translate(
          'xpack.apm.settings.storageExplorer.tableCaption',
          {
            defaultMessage: 'Storage explorer',
          }
        )}
        items={items ?? []}
        columns={columns}
        pagination={true}
        search={search}
        sorting={true}
      />
    </>
  );
}
