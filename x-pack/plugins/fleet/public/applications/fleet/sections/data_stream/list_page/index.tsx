/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiTableActionsColumnType, EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiInMemoryTable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate, FormattedTime } from '@kbn/i18n-react';

import type { DataStream } from '../../../types';
import { useGetDataStreams, usePagination, useBreadcrumbs } from '../../../hooks';
import { PackageIcon } from '../../../components';

import { DataStreamRowActions } from './components/data_stream_row_actions';

export const DataStreamListPage: React.FunctionComponent<{}> = () => {
  useBreadcrumbs('data_streams');

  const { pagination, pageSizeOptions } = usePagination();

  // Fetch data streams
  const { isLoading, data: dataStreamsData, resendRequest } = useGetDataStreams();

  // Some policies retrieved, set up table props
  const columns = useMemo(() => {
    const cols: Array<
      EuiTableFieldDataColumnType<DataStream> | EuiTableActionsColumnType<DataStream>
    > = [
      {
        field: 'dataset',
        sortable: true,
        width: '25%',
        name: i18n.translate('xpack.fleet.dataStreamList.datasetColumnTitle', {
          defaultMessage: 'Dataset',
        }),
      },
      {
        field: 'type',
        sortable: true,
        name: i18n.translate('xpack.fleet.dataStreamList.typeColumnTitle', {
          defaultMessage: 'Type',
        }),
      },
      {
        field: 'namespace',
        sortable: true,
        name: i18n.translate('xpack.fleet.dataStreamList.namespaceColumnTitle', {
          defaultMessage: 'Namespace',
        }),
        render: (namespace: string) => {
          return namespace ? <EuiBadge color="hollow">{namespace}</EuiBadge> : '';
        },
      },
      {
        field: 'package',
        sortable: true,
        name: i18n.translate('xpack.fleet.dataStreamList.integrationColumnTitle', {
          defaultMessage: 'Integration',
        }),
        render(pkg: DataStream['package'], datastream: DataStream) {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {datastream.package_version && (
                <EuiFlexItem grow={false}>
                  <PackageIcon
                    packageName={pkg}
                    version={datastream.package_version}
                    size="m"
                    tryApi={true}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>{pkg}</EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'last_activity_ms',
        sortable: true,
        width: '25%',
        dataType: 'date',
        name: i18n.translate('xpack.fleet.dataStreamList.lastActivityColumnTitle', {
          defaultMessage: 'Last activity',
        }),
        render: (date: DataStream['last_activity_ms']) => {
          return (
            <>
              <FormattedDate value={date} year="numeric" month="short" day="numeric" />
              <> @ </>
              <FormattedTime value={date} hour="numeric" minute="numeric" second="numeric" />
            </>
          );
        },
      },
      {
        field: 'size_in_bytes_formatted',
        sortable: true,
        name: i18n.translate('xpack.fleet.dataStreamList.sizeColumnTitle', {
          defaultMessage: 'Size',
        }),
      },
      {
        name: i18n.translate('xpack.fleet.dataStreamList.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (datastream: DataStream) => <DataStreamRowActions datastream={datastream} />,
          },
        ],
      },
    ];
    return cols;
  }, []);

  const emptyPrompt = useMemo(
    () => (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.fleet.dataStreamList.noDataStreamsPrompt"
              defaultMessage="No data streams"
            />
          </h2>
        }
      />
    ),
    []
  );

  const filterOptions: {
    [key: string]: Array<{
      value: string;
      name: string;
    }>;
  } = {
    dataset: [],
    type: [],
    namespace: [],
    package: [],
  };

  if (dataStreamsData && dataStreamsData.data_streams.length) {
    const dataValues: {
      [key: string]: string[];
    } = {
      dataset: [],
      type: [],
      namespace: [],
      package: [],
    };
    dataStreamsData.data_streams.forEach((stream) => {
      const { dataset, type, namespace, package: pkg } = stream;
      if (!dataValues.dataset.includes(dataset)) {
        dataValues.dataset.push(dataset);
      }
      if (!dataValues.type.includes(type)) {
        dataValues.type.push(type);
      }
      if (!dataValues.namespace.includes(namespace)) {
        dataValues.namespace.push(namespace);
      }
      if (!dataValues.package.includes(pkg)) {
        dataValues.package.push(pkg);
      }
    });
    for (const field in dataValues) {
      if (filterOptions[field]) {
        filterOptions[field] = dataValues[field].sort().map((option) => ({
          value: option,
          name: option,
        }));
      }
    }
  }

  return (
    <EuiInMemoryTable
      loading={isLoading}
      hasActions={true}
      tableLayout="auto"
      message={
        isLoading ? (
          <FormattedMessage
            id="xpack.fleet.dataStreamList.loadingDataStreamsMessage"
            defaultMessage="Loading data streams…"
          />
        ) : dataStreamsData && !dataStreamsData.data_streams.length ? (
          emptyPrompt
        ) : (
          <FormattedMessage
            id="xpack.fleet.dataStreamList.noFilteredDataStreamsMessage"
            defaultMessage="No matching data streams found"
          />
        )
      }
      items={dataStreamsData ? dataStreamsData.data_streams : []}
      itemId="index"
      columns={columns}
      pagination={{
        initialPageSize: pagination.pageSize,
        pageSizeOptions,
      }}
      sorting={true}
      search={{
        toolsRight: [
          <EuiButton
            key="reloadButton"
            color="primary"
            iconType="refresh"
            onClick={() => resendRequest()}
          >
            <FormattedMessage
              id="xpack.fleet.dataStreamList.reloadDataStreamsButtonText"
              defaultMessage="Reload"
            />
          </EuiButton>,
        ],
        box: {
          placeholder: i18n.translate('xpack.fleet.dataStreamList.searchPlaceholderTitle', {
            defaultMessage: 'Filter data streams',
          }),
          incremental: true,
        },
        filters: [
          {
            type: 'field_value_selection',
            field: 'dataset',
            name: i18n.translate('xpack.fleet.dataStreamList.datasetColumnTitle', {
              defaultMessage: 'Dataset',
            }),
            multiSelect: 'or',
            operator: 'exact',
            options: filterOptions.dataset,
          },
          {
            type: 'field_value_selection',
            field: 'type',
            name: i18n.translate('xpack.fleet.dataStreamList.typeColumnTitle', {
              defaultMessage: 'Type',
            }),
            multiSelect: 'or',
            operator: 'exact',
            options: filterOptions.type,
          },
          {
            type: 'field_value_selection',
            field: 'namespace',
            name: i18n.translate('xpack.fleet.dataStreamList.namespaceColumnTitle', {
              defaultMessage: 'Namespace',
            }),
            multiSelect: 'or',
            operator: 'exact',
            options: filterOptions.namespace,
          },
          {
            type: 'field_value_selection',
            field: 'package',
            name: i18n.translate('xpack.fleet.dataStreamList.integrationColumnTitle', {
              defaultMessage: 'Integration',
            }),
            multiSelect: 'or',
            operator: 'exact',
            options: filterOptions.package,
          },
        ],
      }}
    />
  );
};
