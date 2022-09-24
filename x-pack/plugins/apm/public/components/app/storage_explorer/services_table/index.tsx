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
  EuiButtonIcon,
  EuiScreenReaderOnly,
  RIGHT_ALIGNMENT,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ValuesType } from 'utility-types';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import { asPercent } from '../../../../../common/utils/formatters';
import { ServiceLink } from '../../../shared/service_link';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { StorageDetailsPerService } from './storage_details_per_service';
import { getComparisonEnabled } from '../../../shared/time_comparison/get_comparison_enabled';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { asDynamicBytes } from '../../../../../common/utils/formatters';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { SizeLabel } from './size_label';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

type StorageExplorerItems =
  APIReturnType<'GET /internal/apm/storage_explorer'>['serviceStatistics'];

export function ServicesTable() {
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

  const loading =
    status === FETCH_STATUS.NOT_INITIATED || status === FETCH_STATUS.LOADING;

  const columns: Array<EuiBasicTableColumn<ValuesType<StorageExplorerItems>>> =
    [
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
                  defaultMessage: 'Sample rate',
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

  return (
    <EuiInMemoryTable
      tableCaption={i18n.translate('xpack.apm.storageExplorer.table.caption', {
        defaultMessage: 'Storage explorer',
      })}
      items={data?.serviceStatistics ?? []}
      columns={columns}
      pagination={true}
      sorting={true}
      itemId="serviceName"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      loading={loading}
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
  );
}
