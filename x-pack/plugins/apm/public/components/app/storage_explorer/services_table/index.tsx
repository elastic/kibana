/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ReactNode } from 'react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  RIGHT_ALIGNMENT,
  EuiToolTip,
  EuiIcon,
  EuiProgress,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { apmServiceInventoryOptimizedSorting } from '@kbn/observability-plugin/common';
import moment from 'moment';
import { isEmpty } from 'lodash';
import { downloadJson } from '../../../../utils/download_json';
import { AgentName } from '../../../../../typings/es_schemas/ui/fields/agent';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import {
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { ServiceLink } from '../../../shared/links/apm/service_link';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { StorageDetailsPerService } from './storage_details_per_service';
import { getComparisonEnabled } from '../../../shared/time_comparison/get_comparison_enabled';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { asDynamicBytes } from '../../../../../common/utils/formatters';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { SizeLabel } from './size_label';
import { joinByKey } from '../../../../../common/utils/join_by_key';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';

interface StorageExplorerItem {
  serviceName: string;
  environments?: string[];
  size?: number;
  agentName?: AgentName;
  sampling?: number;
}

enum StorageExplorerFieldName {
  ServiceName = 'serviceName',
  Environments = 'environments',
  Sampling = 'sampling',
  Size = 'size',
}
interface Props {
  summaryStatsData?: APIReturnType<'GET /internal/apm/storage_explorer_summary_stats'>;
  loadingSummaryStats: boolean;
}

export function ServicesTable({
  summaryStatsData,
  loadingSummaryStats,
}: Props) {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, ReactNode>
  >({});

  const { core } = useApmPluginContext();

  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      indexLifecyclePhase,
      comparisonEnabled: urlComparisonEnabled,
    },
  } = useApmParams('/storage-explorer');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const comparisonEnabled = getComparisonEnabled({
    core,
    urlComparisonEnabled,
  });

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

  const useOptimizedSorting =
    useKibana().services.uiSettings?.get<boolean>(
      apmServiceInventoryOptimizedSorting
    ) || false;

  const sortedAndFilteredServicesFetch = useFetcher(
    (callApmApi) => {
      if (useOptimizedSorting) {
        return callApmApi('GET /internal/apm/storage_explorer/get_services', {
          params: {
            query: {
              environment,
              kuery,
              indexLifecyclePhase,
              start,
              end,
            },
          },
        });
      }
    },
    [useOptimizedSorting, environment, kuery, indexLifecyclePhase, start, end]
  );

  const serviceStatisticsFetch = useProgressiveFetcher(
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

  const serviceStatisticsItems =
    serviceStatisticsFetch.data?.serviceStatistics ?? [];
  const preloadedServices = sortedAndFilteredServicesFetch.data?.services || [];

  const initialSortField = useOptimizedSorting
    ? StorageExplorerFieldName.ServiceName
    : StorageExplorerFieldName.Size;

  const initialSortDirection =
    initialSortField === StorageExplorerFieldName.ServiceName ? 'asc' : 'desc';

  const loading = serviceStatisticsFetch.status === FETCH_STATUS.LOADING;

  const items = joinByKey(
    [
      ...(initialSortField === StorageExplorerFieldName.ServiceName
        ? preloadedServices
        : []),
      ...serviceStatisticsItems,
    ],
    'serviceName'
  );

  const columns: Array<EuiBasicTableColumn<StorageExplorerItem>> = [
    {
      field: 'serviceName',
      name: i18n.translate(
        'xpack.apm.storageExplorer.table.serviceColumnName',
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
        'xpack.apm.storageExplorer.table.environmentColumnName',
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
            'xpack.apm.storageExplorer.table.samplingColumnDescription',
            {
              defaultMessage: `The number of sampled transactions divided by total throughput. This value may differ from the configured transaction sample rate because it might be affected by the initial service's decision when using head-based sampling or by a set of policies when using tail-based sampling.`,
            }
          )}
        >
          <>
            {i18n.translate(
              'xpack.apm.storageExplorer.table.samplingColumnName',
              {
                defaultMessage: 'Sampling rate',
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
      name: <SizeLabel />,
      render: (_, { size }) => asDynamicBytes(size) || NOT_AVAILABLE_LABEL,
      sortable: true,
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.apm.storageExplorer.table.expandRow', {
              defaultMessage: 'Expand row',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      render: ({ serviceName }: { serviceName: string }) => {
        return (
          <EuiButtonIcon
            data-test-subj={`storageDetailsButton_${serviceName}`}
            onClick={() => toggleRowDetails(serviceName)}
            aria-label={
              itemIdToExpandedRowMap[serviceName]
                ? i18n.translate('xpack.apm.storageExplorer.table.collapse', {
                    defaultMessage: 'Collapse',
                  })
                : i18n.translate('xpack.apm.storageExplorer.table.expand', {
                    defaultMessage: 'Expand',
                  })
            }
            iconType={
              itemIdToExpandedRowMap[serviceName] ? 'arrowUp' : 'arrowDown'
            }
          />
        );
      },
    },
  ];

  const isDownloadButtonDisable =
    isEmpty(serviceStatisticsItems) || loadingSummaryStats;

  return (
    <EuiPanel
      hasShadow={false}
      paddingSize="none"
      style={{ position: 'relative' }}
    >
      {loading && <EuiProgress size="xs" color="accent" position="absolute" />}
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="StorageExplorerDownloadReportButton"
            iconType="download"
            isDisabled={isDownloadButtonDisable}
            onClick={() =>
              downloadJson({
                fileName: `storage-explorefpr-${moment(Date.now()).format(
                  'YYYYMMDDHHmmss'
                )}.json`,
                data: {
                  filters: {
                    rangeFrom,
                    rangeTo,
                    environment,
                    kuery,
                    indexLifecyclePhase,
                  },
                  summary: {
                    totalSize: asDynamicBytes(summaryStatsData?.totalSize),
                    diskSpaceUsedPct: asPercent(
                      summaryStatsData?.diskSpaceUsedPct,
                      1
                    ),
                    estimatedIncrementalSize: asDynamicBytes(
                      summaryStatsData?.estimatedIncrementalSize
                    ),
                    dailyDataGeneration: asDynamicBytes(
                      summaryStatsData?.dailyDataGeneration
                    ),
                    tracesPerMinute: asTransactionRate(
                      summaryStatsData?.tracesPerMinute
                    ),
                    numberOfServices: (
                      summaryStatsData?.numberOfServices ?? 0
                    ).toString(),
                  },
                  services: serviceStatisticsItems.map((item) => ({
                    ...item,
                    sampling: asPercent(item?.sampling, 1),
                    size: item?.size
                      ? asDynamicBytes(item?.size)
                      : NOT_AVAILABLE_LABEL,
                  })),
                },
              })
            }
            fill
          >
            {i18n.translate('xpack.apm.storageExplorer.downloadReport', {
              defaultMessage: 'Download report',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiInMemoryTable
        tableCaption={i18n.translate(
          'xpack.apm.storageExplorer.table.caption',
          {
            defaultMessage: 'Storage Explorer',
          }
        )}
        items={items ?? []}
        columns={columns}
        pagination={true}
        sorting={{
          sort: {
            field: initialSortField,
            direction: initialSortDirection,
          },
        }}
        itemId="serviceName"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        data-test-subj="storageExplorerServicesTable"
        error={
          status === FETCH_STATUS.FAILURE
            ? i18n.translate('xpack.apm.storageExplorer.table.errorMessage', {
                defaultMessage: 'Failed to fetch',
              })
            : ''
        }
        message={
          loading
            ? i18n.translate('xpack.apm.storageExplorer.table.loading', {
                defaultMessage: 'Loading...',
              })
            : i18n.translate('xpack.apm.storageExplorer.table.noResults', {
                defaultMessage: 'No data found',
              })
        }
      />
    </EuiPanel>
  );
}
