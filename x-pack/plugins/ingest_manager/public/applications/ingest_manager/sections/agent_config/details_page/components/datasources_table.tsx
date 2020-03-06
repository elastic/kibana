/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiInMemoryTableProps, EuiBadge } from '@elastic/eui';
import { Datasource } from '../../../../types';
import { useCore } from '../../../../hooks';

type DatasourceWithConfig = Datasource & { configs?: string[] };

interface InMemoryDatasource {
  id: string;
  name: string;
  streams: number;
  packageName?: string;
  packageTitle?: string;
  packageVersion?: string;
  configs: number;
}

interface Props {
  datasources?: DatasourceWithConfig[];
  withConfigsCount?: boolean;
  loading?: EuiInMemoryTableProps<InMemoryDatasource>['loading'];
  message?: EuiInMemoryTableProps<InMemoryDatasource>['message'];
  search?: EuiInMemoryTableProps<InMemoryDatasource>['search'];
  selection?: EuiInMemoryTableProps<InMemoryDatasource>['selection'];
  isSelectable?: EuiInMemoryTableProps<InMemoryDatasource>['isSelectable'];
}

export const DatasourcesTable: React.FunctionComponent<Props> = (
  { datasources: originalDatasources, withConfigsCount, ...rest } = {
    datasources: [],
    withConfigsCount: false,
  }
) => {
  const core = useCore();

  // Flatten some values so that they can be searched via in-memory table search
  const datasources =
    originalDatasources?.map(({ id, name, inputs, package: datasourcePackage, configs }) => ({
      id,
      name,
      streams: inputs.reduce((streamsCount, input) => streamsCount + input.streams.length, 0),
      packageName: datasourcePackage?.name,
      packageTitle: datasourcePackage?.title,
      packageVersion: datasourcePackage?.version,
      configs: configs?.length || 0,
    })) || [];

  const columns: EuiInMemoryTableProps<InMemoryDatasource>['columns'] = [
    {
      field: 'name',
      name: i18n.translate('xpack.ingestManager.configDetails.datasourcesTable.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
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
      field: 'packageVersion',
      name: i18n.translate(
        'xpack.ingestManager.configDetails.datasourcesTable.packageVersionColumnTitle',
        {
          defaultMessage: 'Version',
        }
      ),
    },
    {
      field: 'streams',
      name: i18n.translate(
        'xpack.ingestManager.configDetails.datasourcesTable.streamsCountColumnTitle',
        {
          defaultMessage: 'Streams',
        }
      ),
    },
  ];

  if (withConfigsCount) {
    columns.splice(columns.length - 1, 0, {
      field: 'configs',
      name: i18n.translate(
        'xpack.ingestManager.configDetails.datasourcesTable.configsColumnTitle',
        {
          defaultMessage: 'Configs',
        }
      ),
      render: (configs: number) => {
        return configs === 0 ? (
          <EuiBadge>
            <FormattedMessage
              id="xpack.ingestManager.configDetails.datasourcesTable.unassignedLabelText"
              defaultMessage="Unassigned"
            />
          </EuiBadge>
        ) : (
          configs
        );
      },
    });
  }

  return (
    <EuiInMemoryTable<InMemoryDatasource>
      itemId="id"
      items={datasources || ([] as InMemoryDatasource[])}
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
