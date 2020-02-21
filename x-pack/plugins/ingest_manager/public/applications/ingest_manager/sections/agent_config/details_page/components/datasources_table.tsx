/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiInMemoryTableProps, EuiLink, EuiBadge } from '@elastic/eui';
import { Datasource } from '../../../../types';
import { useCore } from '../../../../hooks';

type DatasourceWithPolicy = Datasource & { policies?: string[] };

interface InMemoryDatasource {
  id: string;
  name: string;
  streams: number;
  packageName?: string;
  packageTitle?: string;
  packageVersion?: string;
  packageDescription?: string;
  policies: number;
}

interface Props {
  datasources?: DatasourceWithPolicy[];
  withPoliciesCount?: boolean;
  loading?: EuiInMemoryTableProps<InMemoryDatasource>['loading'];
  message?: EuiInMemoryTableProps<InMemoryDatasource>['message'];
  search?: EuiInMemoryTableProps<InMemoryDatasource>['search'];
  selection?: EuiInMemoryTableProps<InMemoryDatasource>['selection'];
  isSelectable?: EuiInMemoryTableProps<InMemoryDatasource>['isSelectable'];
}

export const DatasourcesTable: React.FunctionComponent<Props> = (
  { datasources: originalDatasources, withPoliciesCount, ...rest } = {
    datasources: [],
    withPoliciesCount: false,
  }
) => {
  const core = useCore();

  // Flatten some values so that they can be searched via in-memory table search
  const datasources =
    originalDatasources?.map(({ id, name, streams, package: datasourcePackage, policies }) => ({
      id,
      name,
      streams: streams?.length || 0,
      packageName: datasourcePackage?.name,
      packageTitle: datasourcePackage?.title,
      packageVersion: datasourcePackage?.version,
      packageDescription: datasourcePackage?.description,
      policies: policies?.length || 0,
    })) || [];

  const columns: EuiInMemoryTableProps<InMemoryDatasource>['columns'] = [
    {
      field: 'name',
      name: i18n.translate('xpack.ingestManager.policyDetails.datasourcesTable.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
    },
    {
      field: 'packageTitle',
      name: i18n.translate(
        'xpack.ingestManager.policyDetails.datasourcesTable.packageNameColumnTitle',
        {
          defaultMessage: 'Package',
        }
      ),
    },
    {
      field: 'packageVersion',
      name: i18n.translate(
        'xpack.ingestManager.policyDetails.datasourcesTable.packageVersionColumnTitle',
        {
          defaultMessage: 'Version',
        }
      ),
    },
    {
      field: 'streams',
      name: i18n.translate(
        'xpack.ingestManager.policyDetails.datasourcesTable.streamsCountColumnTitle',
        {
          defaultMessage: 'Streams',
        }
      ),
    },
    {
      name: i18n.translate(
        'xpack.ingestManager.policyDetails.datasourcesTable.actionsColumnTitle',
        {
          defaultMessage: 'Actions',
        }
      ),
      actions: [
        {
          render: ({ packageName, packageVersion }: any) => {
            return (
              <EuiLink
                color="primary"
                external
                target="_blank"
                href={`${
                  window.location.origin
                }${core.http.basePath.get()}/app/epm#/detail/${packageName}-${packageVersion}`}
              >
                <FormattedMessage
                  id="xpack.ingestManager.policyDetails.datasourcesTable.viewActionLinkText"
                  defaultMessage="view"
                />
              </EuiLink>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  if (withPoliciesCount) {
    columns.splice(columns.length - 1, 0, {
      field: 'policies',
      name: i18n.translate(
        'xpack.ingestManager.policyDetails.datasourcesTable.policiesColumnTitle',
        {
          defaultMessage: 'Policies',
        }
      ),
      render: (policies: number) => {
        return policies === 0 ? (
          <EuiBadge>
            <FormattedMessage
              id="xpack.ingestManager.policyDetails.datasourcesTable.unassignedLabelText"
              defaultMessage="Unassigned"
            />
          </EuiBadge>
        ) : (
          policies
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
