/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable, EuiInMemoryTableProps, EuiBadge, EuiTextColor } from '@elastic/eui';
import { Datasource } from '../../../../../types';

interface InMemoryDatasource extends Datasource {
  streams: { total: number; enabled: number };
  packageName?: string;
  packageTitle?: string;
  packageVersion?: string;
}

interface Props {
  datasources: Datasource[];
  // Pass through props to InMemoryTable
  loading?: EuiInMemoryTableProps<InMemoryDatasource>['loading'];
  message?: EuiInMemoryTableProps<InMemoryDatasource>['message'];
  search?: EuiInMemoryTableProps<InMemoryDatasource>['search'];
  selection?: EuiInMemoryTableProps<InMemoryDatasource>['selection'];
  isSelectable?: EuiInMemoryTableProps<InMemoryDatasource>['isSelectable'];
}

export const DatasourcesTable: React.FunctionComponent<Props> = ({
  datasources: originalDatasources,
  ...rest
}) => {
  // Flatten some values so that they can be searched via in-memory table search
  const datasources = useMemo(
    () =>
      originalDatasources.map<InMemoryDatasource>(datasource => ({
        ...datasource,
        streams: datasource.inputs.reduce(
          (streams, input) => {
            streams.total += input.streams.length;
            streams.enabled += input.enabled
              ? input.streams.filter(stream => stream.enabled).length
              : 0;

            return streams;
          },
          { total: 0, enabled: 0 }
        ),
        packageName: datasource.package?.name ?? '',
        packageTitle: datasource.package?.title ?? '',
        packageVersion: datasource.package?.version ?? '',
      })) || [],
    [originalDatasources]
  );

  const columns = useMemo(
    (): EuiInMemoryTableProps<InMemoryDatasource>['columns'] => [
      {
        field: 'name',
        name: i18n.translate('xpack.ingestManager.configDetails.datasourcesTable.nameColumnTitle', {
          defaultMessage: 'Data source',
        }),
      },
      {
        field: 'description',
        name: i18n.translate(
          'xpack.ingestManager.configDetails.datasourcesTable.descriptionColumnTitle',
          {
            defaultMessage: 'Description',
          }
        ),
        truncateText: true,
      },
      {
        field: 'packageTitle',
        name: i18n.translate(
          'xpack.ingestManager.configDetails.datasourcesTable.packageNameColumnTitle',
          {
            defaultMessage: 'Package',
          }
        ),
      },
      {
        field: 'namespace',
        name: i18n.translate(
          'xpack.ingestManager.configDetails.datasourcesTable.namespaceColumnTitle',
          {
            defaultMessage: 'Namespace',
          }
        ),
        render: (namespace: InMemoryDatasource['namespace']) => {
          if (namespace) {
            return <EuiBadge>{namespace}</EuiBadge>;
          }
          return '';
        },
      },
      {
        field: 'platform',
        name: i18n.translate(
          'xpack.ingestManager.configDetails.datasourcesTable.platformColumnTitle',
          {
            defaultMessage: 'Platform',
          }
        ),
        render(platform: unknown) {
          // FIXME: where do we get this from?
          return '???? FIXME';
        },
      },
      {
        field: 'streams',
        name: i18n.translate(
          'xpack.ingestManager.configDetails.datasourcesTable.streamsCountColumnTitle',
          {
            defaultMessage: 'Streams',
          }
        ),
        render: (streams: InMemoryDatasource['streams']) => {
          return (
            <>
              <EuiTextColor>{streams.enabled}</EuiTextColor>
              <EuiTextColor color="subdued">&nbsp;/ {streams.total}</EuiTextColor>
            </>
          );
        },
      },
      {
        field: 'Action here', // FIXME: implement actions
        name: i18n.translate(
          'xpack.ingestManager.configDetails.datasourcesTable.actionsColumnTitle',
          {
            defaultMessage: 'Actions',
          }
        ),
        render: () => 'FIXME: actions',
      },
    ],
    []
  );

  return (
    <EuiInMemoryTable<InMemoryDatasource>
      itemId="id"
      items={datasources}
      columns={columns}
      sorting={{
        sort: {
          field: 'name',
          direction: 'asc',
        },
      }}
      {...rest}
    />
  );
};
