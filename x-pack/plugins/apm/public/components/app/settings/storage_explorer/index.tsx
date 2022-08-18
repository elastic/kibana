/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, ReactNode } from 'react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  euiPaletteColorBlind,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  RIGHT_ALIGNMENT,
  EuiToolTip,
  EuiIcon,
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
import { IndexLifecyclePhaseSelectOption } from '../../../../../common/storage_explorer_types';
import { asDynamicBytes } from '../../../../../common/utils/formatters';
import { asPercent } from '../../../../../common/utils/formatters';
import { IndexLifecyclePhaseSelect } from './index_lifecycle_phase_select';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { ApmDatePicker } from '../../../shared/date_picker/apm_date_picker';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { ApmEnvironmentFilter } from '../../../shared/environment_filter';
import { KueryBar } from '../../../shared/kuery_bar';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { ServiceLink } from '../../../shared/service_link';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { getComparisonEnabled } from '../../../shared/time_comparison/get_comparison_enabled';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { StorageDetailsPerService } from './storage_details_per_service';
import { BetaBadge } from '../../../shared/beta_badge';

type StorageExplorerItem =
  APIReturnType<'GET /internal/apm/storage_explorer'>['serviceStatistics'][0];

export function StorageExplorer() {
  const [indexLifecyclePhase, setIndexLifecyclePhase] = useState(
    IndexLifecyclePhaseSelectOption.Hot
  );

  const euiPaletteColorBlindRotations = 3;
  const chartTheme = useChartTheme();
  const groupedPalette = euiPaletteColorBlind({
    rotations: euiPaletteColorBlindRotations,
  });

  const { core } = useApmPluginContext();
  const comparisonEnabled = getComparisonEnabled({ core });

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, ReactNode>
  >({});

  const {
    query: { rangeFrom, rangeTo, environment, kuery },
  } = useApmParams('/settings/storage-explorer');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const toggleRowDetails = (selectedServiceName: string) => {
    const expandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (expandedRowMapValues[selectedServiceName]) {
      delete expandedRowMapValues[selectedServiceName];
    } else {
      expandedRowMapValues[selectedServiceName] = (
        <StorageDetailsPerService
          serviceName={selectedServiceName}
          indexLifecyclePhase={indexLifecyclePhase}
        />
      );
    }
    setItemIdToExpandedRowMap(expandedRowMapValues);
  };

  const { data, status } = useProgressiveFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/storage_explorer', {
        params: {
          query: {
            indexLifecyclePhase,
            start,
            end,
            environment,
            kuery,
          },
        },
      });
    },
    [indexLifecyclePhase, start, end, environment, kuery]
  );

  useEffect(() => {
    // Closes any open rows when fetching new items
    setItemIdToExpandedRowMap({});
  }, [status]);

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
      render: (_, { serviceName, agentName }) => {
        const serviceLinkQuery = {
          comparisonEnabled,
          environment,
          kuery,
          rangeFrom,
          rangeTo,
          serviceGroup: '',
        };

        return (
          <TruncateWithTooltip
            data-test-subj="apmStorageExplorerServiceLink"
            text={serviceName || NOT_AVAILABLE_LABEL}
            content={
              <ServiceLink
                query={serviceLinkQuery}
                serviceName={serviceName}
                agentName={agentName}
              />
            }
          />
        );
      },
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
      field: 'sampling',
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.settings.storageExplorer.table.samplingColumnDescription',
            {
              defaultMessage:
                'The ratio of sampled transactions to the total number of transactions.',
            }
          )}
        >
          <>
            {i18n.translate(
              'xpack.apm.settings.storageExplorer.table.samplingColumnName',
              {
                defaultMessage: 'Sampling',
              }
            )}{' '}
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
            />
          </>
        </EuiToolTip>
      ),
      render: (value: string) => asPercent(parseFloat(value), 1),
      sortable: true,
    },
    {
      field: 'size',
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.settings.storageExplorer.table.sizeColumnDescription',
            {
              defaultMessage:
                'Estimated size for both primary and replica shards calculated by prorating the total size of the indices by the number of documents returned.',
            }
          )}
        >
          <>
            {i18n.translate(
              'xpack.apm.settings.storageExplorer.table.sizeColumnName',
              {
                defaultMessage: 'Size',
              }
            )}{' '}
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
            />
          </>
        </EuiToolTip>
      ),
      render: (_, { size }) => asDynamicBytes(size) || NOT_AVAILABLE_LABEL,
      sortable: true,
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>Expand rows</span>
        </EuiScreenReaderOnly>
      ),
      render: ({ serviceName }: { serviceName: string }) => {
        return (
          <EuiButtonIcon
            data-test-subj={`storageDetailsButton_${serviceName}`}
            onClick={() => toggleRowDetails(serviceName)}
            aria-label={
              itemIdToExpandedRowMap[serviceName] ? 'Collapse' : 'Expand'
            }
            iconType={
              itemIdToExpandedRowMap[serviceName] ? 'arrowUp' : 'arrowDown'
            }
          />
        );
      },
    },
  ];

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
      <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.apm.settings.storageExplorer.title', {
                defaultMessage: 'Storage explorer',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <BetaBadge />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule />

      {items && false && !isEmpty(items) && (
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

      <EuiFlexGroup>
        <EuiFlexItem grow={5}>
          <KueryBar />,
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <ApmDatePicker />,
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <ApmEnvironmentFilter />,
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <IndexLifecyclePhaseSelect
            indexLifecyclePhase={indexLifecyclePhase}
            onChange={setIndexLifecyclePhase}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

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
        sorting={true}
        itemId="serviceName"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      />
    </>
  );
}
