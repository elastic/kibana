/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  euiPaletteColorBlind,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  PartitionLayout,
  Chart,
  Partition,
  Datum,
  Settings,
} from '@elastic/charts';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../hooks/use_progressive_fetcher';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import { IndexLifecyclePhase } from '../../../../../common/storage_explorer_types';
import { asDynamicBytes } from '../../../../../common/utils/formatters';
import { asPercent } from '../../../../../common/utils/formatters';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { IndexLifecyclePhaseSelect } from './index_lifecycle_phase_select';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

type StorageExplorerItem =
  APIReturnType<'GET /internal/apm/storage_explorer'>['serviceStatistics'][0];

export function StorageExplorer() {
  const [indexLifecyclePhase, setIndexLifecyclePhase] = useState(
    IndexLifecyclePhase.Hot
  );

  const euiPaletteColorBlindRotations = 3;
  const chartTheme = useChartTheme();
  const groupedPalette = euiPaletteColorBlind({
    rotations: euiPaletteColorBlindRotations,
  });

  const { data, status } = useProgressiveFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/storage_explorer', {
        params: {
          query: {
            indexLifecyclePhase,
          },
        },
      });
    },
    [indexLifecyclePhase]
  );

  const items = data?.serviceStatistics ?? [];

  const columns: Array<EuiBasicTableColumn<StorageExplorerItem>> = [
    {
      field: 'serviceName',
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
      render: (_, { environments }) => (
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
      render: (_, { size }) => asDynamicBytes(size) || NOT_AVAILABLE_LABEL,
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
      field: 'transactionDocs',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.transactionsColumnName',
        {
          defaultMessage: 'Transactions',
        }
      ),
      sortable: true,
    },
    {
      field: 'spanDocs',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.spansColumnName',
        {
          defaultMessage: 'Spans',
        }
      ),
      sortable: true,
    },
    {
      field: 'errorDocs',
      name: i18n.translate(
        'xpack.apm.settings.storageExplorer.table.errorsColumnName',
        {
          defaultMessage: 'Errors',
        }
      ),
      sortable: true,
    },
    {
      field: 'metricDocs',
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
    toolsRight: [
      <IndexLifecyclePhaseSelect
        indexLifecyclePhase={indexLifecyclePhase}
        onChange={setIndexLifecyclePhase}
      />,
    ],
  };

  const loading =
    isEmpty(items) &&
    (status === FETCH_STATUS.NOT_INITIATED || status === FETCH_STATUS.LOADING);

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
        iconType="gear"
        title={
          <h2>
            {i18n.translate(
              'xpack.apm.settings.storageExplorer.errorPromptTitle',
              {
                defaultMessage: 'Could not load storage explorer',
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

      {items && !isEmpty(items) && (
        <>
          <Chart size={{ height: 240 }}>
            <Settings theme={chartTheme} />
            <Partition
              id="storage_explorer_treemap"
              data={items}
              layout={PartitionLayout.treemap}
              valueAccessor={(d) => d.size ?? 0}
              valueFormatter={(d: number) =>
                asDynamicBytes(d) || NOT_AVAILABLE_LABEL
              }
              layers={[
                {
                  groupByRollup: (d: Datum) => d.serviceName,
                  shape: {
                    fillColor: (d) => {
                      return groupedPalette[
                        Math.floor(
                          d.sortIndex % (10 * euiPaletteColorBlindRotations)
                        )
                      ];
                    },
                  },
                },
              ]}
            />
          </Chart>
          <EuiSpacer size="m" />
        </>
      )}

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
