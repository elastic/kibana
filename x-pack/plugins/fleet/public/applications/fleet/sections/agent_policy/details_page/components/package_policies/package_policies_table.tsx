/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { EuiInMemoryTableProps } from '@elastic/eui';
import {
  EuiInMemoryTable,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';

import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../common';
import { pagePathGetters } from '../../../../../../../constants';
import type { AgentPolicy, PackagePolicy } from '../../../../../types';
import { PackageIcon, PackagePolicyActionsMenu } from '../../../../../components';
import { useCapabilities, useStartServices } from '../../../../../hooks';

interface InMemoryPackagePolicy extends PackagePolicy {
  packageName?: string;
  packageTitle?: string;
  packageVersion?: string;
}

interface Props {
  packagePolicies: PackagePolicy[];
  agentPolicy: AgentPolicy;
  // Pass through props to InMemoryTable
  loading?: EuiInMemoryTableProps<InMemoryPackagePolicy>['loading'];
  message?: EuiInMemoryTableProps<InMemoryPackagePolicy>['message'];
}

interface FilterOption {
  name: string;
  value: string;
}

const stringSortAscending = (a: string, b: string): number => a.localeCompare(b);
const toFilterOption = (value: string): FilterOption => ({ name: value, value });

export const PackagePoliciesTable: React.FunctionComponent<Props> = ({
  packagePolicies: originalPackagePolicies,
  agentPolicy,
  ...rest
}) => {
  const { application } = useStartServices();
  const hasWriteCapabilities = useCapabilities().write;

  // With the package policies provided on input, generate the list of package policies
  // used in the InMemoryTable (flattens some values for search) as well as
  // the list of options that will be used in the filters dropdowns
  const [packagePolicies, namespaces] = useMemo((): [InMemoryPackagePolicy[], FilterOption[]] => {
    const namespacesValues: string[] = [];
    const inputTypesValues: string[] = [];
    const mappedPackagePolicies = originalPackagePolicies.map<InMemoryPackagePolicy>(
      (packagePolicy) => {
        if (packagePolicy.namespace && !namespacesValues.includes(packagePolicy.namespace)) {
          namespacesValues.push(packagePolicy.namespace);
        }

        return {
          ...packagePolicy,
          packageName: packagePolicy.package?.name ?? '',
          packageTitle: packagePolicy.package?.title ?? '',
          packageVersion: packagePolicy.package?.version ?? '',
        };
      }
    );

    namespacesValues.sort(stringSortAscending);
    inputTypesValues.sort(stringSortAscending);

    return [mappedPackagePolicies, namespacesValues.map(toFilterOption)];
  }, [originalPackagePolicies]);

  const columns = useMemo(
    (): EuiInMemoryTableProps<InMemoryPackagePolicy>['columns'] => [
      {
        field: 'name',
        sortable: true,
        name: i18n.translate('xpack.fleet.policyDetails.packagePoliciesTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        render: (value: string) => (
          <span className="eui-textTruncate" title={value}>
            {value}
          </span>
        ),
      },
      {
        field: 'description',
        name: i18n.translate(
          'xpack.fleet.policyDetails.packagePoliciesTable.descriptionColumnTitle',
          {
            defaultMessage: 'Description',
          }
        ),
        render: (value: string) => (
          <span className="eui-textTruncate" title={value}>
            {value}
          </span>
        ),
      },
      {
        field: 'packageTitle',
        sortable: true,
        name: i18n.translate(
          'xpack.fleet.policyDetails.packagePoliciesTable.packageNameColumnTitle',
          {
            defaultMessage: 'Integration',
          }
        ),
        render(packageTitle: string, packagePolicy: InMemoryPackagePolicy) {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {packagePolicy.package && (
                <EuiFlexItem grow={false}>
                  <PackageIcon
                    packageName={packagePolicy.package.name}
                    version={packagePolicy.package.version}
                    size="m"
                    tryApi={true}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>{packageTitle}</EuiFlexItem>
              {packagePolicy.package && (
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued" size="xs" className="eui-textNoWrap">
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.packagePoliciesTable.packageVersion"
                      defaultMessage="v{version}"
                      values={{ version: packagePolicy.package.version }}
                    />
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'namespace',
        name: i18n.translate(
          'xpack.fleet.policyDetails.packagePoliciesTable.namespaceColumnTitle',
          {
            defaultMessage: 'Namespace',
          }
        ),
        render: (namespace: InMemoryPackagePolicy['namespace']) => {
          return namespace ? <EuiBadge color="hollow">{namespace}</EuiBadge> : '';
        },
      },
      {
        name: i18n.translate('xpack.fleet.policyDetails.packagePoliciesTable.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (packagePolicy: InMemoryPackagePolicy) => {
              return (
                <PackagePolicyActionsMenu agentPolicy={agentPolicy} packagePolicy={packagePolicy} />
              );
            },
          },
        ],
      },
    ],
    [agentPolicy]
  );

  return (
    <EuiInMemoryTable<InMemoryPackagePolicy>
      itemId="id"
      items={packagePolicies}
      columns={columns}
      sorting={{
        sort: {
          field: 'name',
          direction: 'asc',
        },
      }}
      {...rest}
      search={{
        toolsRight: agentPolicy.is_managed
          ? []
          : [
              <EuiButton
                key="addPackagePolicyButton"
                isDisabled={!hasWriteCapabilities}
                iconType="refresh"
                onClick={() => {
                  application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
                    path: `#${pagePathGetters.integrations_all()[1]}`,
                    state: { forAgentPolicyId: agentPolicy.id },
                  });
                }}
              >
                <FormattedMessage
                  id="xpack.fleet.policyDetails.addPackagePolicyButtonText"
                  defaultMessage="Add integration"
                />
              </EuiButton>,
            ],
        box: {
          incremental: true,
          schema: true,
        },
        filters: [
          {
            type: 'field_value_selection',
            field: 'namespace',
            name: 'Namespace',
            options: namespaces,
            multiSelect: 'or',
            operator: 'exact',
          },
        ],
      }}
      isSelectable={false}
    />
  );
};
