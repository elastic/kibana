/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CriteriaWithPagination,
  EuiBadge,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asDynamicBytes, asAbsoluteDateTime } from '@kbn/observability-plugin/common';
import React, { useMemo, useState } from 'react';
import { StorageExplorerHostDetails } from '../../../../common/storage_explorer';
import { LabelWithHint } from '../../../components/label_with_hint';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';

interface Props {
  data?: StorageExplorerHostDetails[];
  hasDistinctProbabilisticValues: boolean;
}

const sorting = {
  sort: {
    field: 'hostName',
    direction: 'desc' as const,
  },
};

export function HostsTable({ data = [], hasDistinctProbabilisticValues }: Props) {
  const { query } = useProfilingParams('/storage-explorer');
  const { rangeFrom, rangeTo } = query;
  const profilingRouter = useProfilingRouter();
  const [pagination, setPagination] = useState({ pageIndex: 0 });

  function onTableChange({ page: { index } }: CriteriaWithPagination<StorageExplorerHostDetails>) {
    setPagination({ pageIndex: index });
  }

  const probabilisticValuesCountPerProjectId = data.reduce<Record<string, number>>((acc, curr) => {
    const projectId = curr.projectId;
    const currentCount = acc[projectId] ?? 0;
    return { ...acc, [projectId]: currentCount + 1 };
  }, {});

  const columns: Array<EuiBasicTableColumn<StorageExplorerHostDetails>> = useMemo(
    () => [
      ...(hasDistinctProbabilisticValues
        ? [
            {
              field: 'distinctProbabilisticWarning',
              width: '30',
              name: '',
              sortable: true,
              render: (_, item) => {
                if (probabilisticValuesCountPerProjectId[item.projectId] > 1) {
                  return (
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.profiling.storageExplorer.hostsTable.distinctProbabilisticValues',
                        {
                          defaultMessage:
                            "We've identified distinct probabilistic profiling values for the same project",
                        }
                      )}
                    >
                      <EuiIcon type="warning" color="warning" />
                    </EuiToolTip>
                  );
                }
              },
            } as EuiBasicTableColumn<StorageExplorerHostDetails>,
          ]
        : []),
      {
        field: 'projectId',
        width: '100',
        name: i18n.translate('xpack.profiling.storageExplorer.hostsTable.projectId', {
          defaultMessage: 'Project ID',
        }),
        sortable: true,
      },
      {
        field: 'hostName',
        name: (
          <LabelWithHint
            label={i18n.translate('xpack.profiling.storageExplorer.hostsTable.host', {
              defaultMessage: 'Host',
            })}
            hint={i18n.translate('xpack.profiling.storageExplorer.hostsTable.host.hint', {
              defaultMessage: 'host.name[host.id]',
            })}
            labelSize="xs"
            labelStyle={{ fontWeight: 700 }}
            iconSize="s"
          />
        ),
        sortable: true,
        render: (_, item) => {
          return (
            <EuiLink
              data-test-subj={`hostId_${item.hostId}`}
              className="eui-textTruncate"
              href={profilingRouter.link('/flamegraphs/flamegraph', {
                query: { rangeFrom, rangeTo, kuery: `${'host.id'}: "${item.hostId}"` },
              })}
            >{`${item.hostName} [${item.hostId}]`}</EuiLink>
          );
        },
      },
      {
        field: 'probabilisticValues',
        name: i18n.translate('xpack.profiling.storageExplorer.hostsTable.probabilisticValues', {
          defaultMessage: 'Probabilistic Profiling values',
        }),
        sortable: true,
        render: (probabilisticValues: StorageExplorerHostDetails['probabilisticValues']) => {
          return (
            <EuiFlexGroup gutterSize="s">
              {probabilisticValues.map((value, index) => {
                return (
                  <EuiFlexItem key={index} grow={false}>
                    {value.date ? (
                      <EuiToolTip
                        content={i18n.translate(
                          'xpack.profiling.storageExplorer.hostsTable.probabilisticProfilingValues',
                          {
                            defaultMessage: 'Introduced on {date}',
                            values: { date: asAbsoluteDateTime(value.date) },
                          }
                        )}
                      >
                        <EuiBadge color="hollow" isDisabled={index > 0}>
                          {value.value}
                        </EuiBadge>
                      </EuiToolTip>
                    ) : (
                      <EuiBadge color="hollow" isDisabled={index > 0}>
                        {value.value}
                      </EuiBadge>
                    )}
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'totalMetricsSize',
        name: i18n.translate('xpack.profiling.storageExplorer.hostsTable.metricsData', {
          defaultMessage: 'Metrics data',
        }),
        sortable: true,
        width: '200',
        render: (size: StorageExplorerHostDetails['totalMetricsSize']) => asDynamicBytes(size),
      },
      {
        field: 'totalEventsSize',
        name: i18n.translate('xpack.profiling.storageExplorer.hostsTable.samplesData', {
          defaultMessage: 'Samples data',
        }),
        sortable: true,
        width: '200',
        render: (size: StorageExplorerHostDetails['totalEventsSize']) => asDynamicBytes(size),
      },
      {
        field: 'totalSize',
        name: (
          <LabelWithHint
            label={i18n.translate('xpack.profiling.storageExplorer.hostsTable.totalData', {
              defaultMessage: 'Total data',
            })}
            hint={i18n.translate('xpack.profiling.storageExplorer.hostsTable.totalData.hint', {
              defaultMessage: 'The combined value of Universal Profiling metrics and samples.',
            })}
            labelSize="xs"
            labelStyle={{ fontWeight: 700 }}
            iconSize="s"
          />
        ),
        sortable: true,
        width: '200',
        render: (size: StorageExplorerHostDetails['totalSize']) => asDynamicBytes(size),
      },
    ],
    [
      hasDistinctProbabilisticValues,
      probabilisticValuesCountPerProjectId,
      profilingRouter,
      rangeFrom,
      rangeTo,
    ]
  );

  return (
    <EuiInMemoryTable
      items={data}
      columns={columns}
      sorting={sorting}
      pagination={{ pageSize: 10, showPerPageOptions: false, ...pagination }}
      onTableChange={onTableChange}
    />
  );
}
