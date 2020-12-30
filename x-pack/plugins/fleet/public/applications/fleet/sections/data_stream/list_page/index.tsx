/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiTableActionsColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate } from '@kbn/i18n/react';
import { DataStream } from '../../../types';
import { WithHeaderLayout } from '../../../layouts';
import { useGetDataStreams, useStartServices, usePagination, useBreadcrumbs } from '../../../hooks';
import { PackageIcon } from '../../../components/package_icon';
import { DataStreamRowActions } from './components/data_stream_row_actions';

const DataStreamListPageLayout: React.FunctionComponent = ({ children }) => (
  <WithHeaderLayout
    leftColumn={
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.fleet.dataStreamList.pageTitle"
                defaultMessage="Data streams"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.fleet.dataStreamList.pageSubtitle"
                defaultMessage="Manage the data created by your agents."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  >
    {children}
  </WithHeaderLayout>
);

export const DataStreamListPage: React.FunctionComponent<{}> = () => {
  useBreadcrumbs('data_streams');

  const {
    data: { fieldFormats },
  } = useStartServices();

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
        field: 'last_activity',
        sortable: true,
        width: '25%',
        dataType: 'date',
        name: i18n.translate('xpack.fleet.dataStreamList.lastActivityColumnTitle', {
          defaultMessage: 'Last activity',
        }),
        render: (date: DataStream['last_activity']) => {
          try {
            const formatter = fieldFormats.getInstance('date');
            return formatter.convert(date);
          } catch (e) {
            return <FormattedDate value={date} year="numeric" month="short" day="2-digit" />;
          }
        },
      },
      {
        field: 'size_in_bytes',
        sortable: true,
        name: i18n.translate('xpack.fleet.dataStreamList.sizeColumnTitle', {
          defaultMessage: 'Size',
        }),
        render: (size: DataStream['size_in_bytes']) => {
          try {
            const formatter = fieldFormats.getInstance('bytes');
            return formatter.convert(size);
          } catch (e) {
            return `${size}b`;
          }
        },
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
  }, [fieldFormats]);

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
    <DataStreamListPageLayout>
      <EuiInMemoryTable
        loading={isLoading}
        hasActions={true}
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
    </DataStreamListPageLayout>
  );
};
