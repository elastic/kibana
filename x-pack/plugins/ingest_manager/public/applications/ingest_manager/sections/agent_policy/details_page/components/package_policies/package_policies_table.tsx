/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiBadge,
  EuiContextMenuItem,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { AgentPolicy, PackagePolicy } from '../../../../../types';
import { PackageIcon, ContextMenuActions } from '../../../../../components';
import { PackagePolicyDeleteProvider, DangerEuiContextMenuItem } from '../../../components';
import { useCapabilities, useLink } from '../../../../../hooks';
import { useAgentPolicyRefresh } from '../../hooks';

interface InMemoryPackagePolicy extends PackagePolicy {
  inputTypes: string[];
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
  const { getHref } = useLink();
  const hasWriteCapabilities = useCapabilities().write;
  const refreshAgentPolicy = useAgentPolicyRefresh();

  // With the package policies provided on input, generate the list of package policies
  // used in the InMemoryTable (flattens some values for search) as well as
  // the list of options that will be used in the filters dropdowns
  const [packagePolicies, namespaces, inputTypes] = useMemo((): [
    InMemoryPackagePolicy[],
    FilterOption[],
    FilterOption[]
  ] => {
    const namespacesValues: string[] = [];
    const inputTypesValues: string[] = [];
    const mappedPackagePolicies = originalPackagePolicies.map<InMemoryPackagePolicy>(
      (packagePolicy) => {
        if (packagePolicy.namespace && !namespacesValues.includes(packagePolicy.namespace)) {
          namespacesValues.push(packagePolicy.namespace);
        }

        const dsInputTypes: string[] = [];

        dsInputTypes.sort(stringSortAscending);

        return {
          ...packagePolicy,
          inputTypes: dsInputTypes,
          packageName: packagePolicy.package?.name ?? '',
          packageTitle: packagePolicy.package?.title ?? '',
          packageVersion: packagePolicy.package?.version ?? '',
        };
      }
    );

    namespacesValues.sort(stringSortAscending);
    inputTypesValues.sort(stringSortAscending);

    return [
      mappedPackagePolicies,
      namespacesValues.map(toFilterOption),
      inputTypesValues.map(toFilterOption),
    ];
  }, [originalPackagePolicies]);

  const columns = useMemo(
    (): EuiInMemoryTableProps<InMemoryPackagePolicy>['columns'] => [
      {
        field: 'name',
        sortable: true,
        name: i18n.translate(
          'xpack.ingestManager.policyDetails.packagePoliciesTable.nameColumnTitle',
          {
            defaultMessage: 'Name',
          }
        ),
        render: (value: string) => (
          <span className="eui-textTruncate" title={value}>
            {value}
          </span>
        ),
      },
      {
        field: 'description',
        name: i18n.translate(
          'xpack.ingestManager.policyDetails.packagePoliciesTable.descriptionColumnTitle',
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
          'xpack.ingestManager.policyDetails.packagePoliciesTable.packageNameColumnTitle',
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
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'namespace',
        name: i18n.translate(
          'xpack.ingestManager.policyDetails.packagePoliciesTable.namespaceColumnTitle',
          {
            defaultMessage: 'Namespace',
          }
        ),
        render: (namespace: InMemoryPackagePolicy['namespace']) => {
          return namespace ? <EuiBadge color="hollow">{namespace}</EuiBadge> : '';
        },
      },
      {
        name: i18n.translate(
          'xpack.ingestManager.policyDetails.packagePoliciesTable.actionsColumnTitle',
          {
            defaultMessage: 'Actions',
          }
        ),
        actions: [
          {
            render: (packagePolicy: InMemoryPackagePolicy) => (
              <ContextMenuActions
                items={[
                  // FIXME: implement View package policy action
                  // <EuiContextMenuItem
                  //   disabled
                  //   icon="inspect"
                  //   onClick={() => {}}
                  //   key="packagePolicyView"
                  // >
                  //   <FormattedMessage
                  //     id="xpack.ingestManager.policyDetails.packagePoliciesTable.viewActionTitle"
                  //     defaultMessage="View integration"
                  //   />
                  // </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    disabled={!hasWriteCapabilities}
                    icon="pencil"
                    href={getHref('edit_integration', {
                      policyId: agentPolicy.id,
                      packagePolicyId: packagePolicy.id,
                    })}
                    key="packagePolicyEdit"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.policyDetails.packagePoliciesTable.editActionTitle"
                      defaultMessage="Edit integration"
                    />
                  </EuiContextMenuItem>,
                  // FIXME: implement Copy package policy action
                  // <EuiContextMenuItem disabled icon="copy" onClick={() => {}} key="packagePolicyCopy">
                  //   <FormattedMessage
                  //     id="xpack.ingestManager.policyDetails.packagePoliciesTable.copyActionTitle"
                  //     defaultMessage="Copy integration"
                  //   />
                  // </EuiContextMenuItem>,
                  <PackagePolicyDeleteProvider agentPolicy={agentPolicy} key="packagePolicyDelete">
                    {(deletePackagePoliciesPrompt) => {
                      return (
                        <DangerEuiContextMenuItem
                          disabled={!hasWriteCapabilities}
                          icon="trash"
                          onClick={() => {
                            deletePackagePoliciesPrompt([packagePolicy.id], refreshAgentPolicy);
                          }}
                        >
                          <FormattedMessage
                            id="xpack.ingestManager.policyDetails.packagePoliciesTable.deleteActionTitle"
                            defaultMessage="Delete integration"
                          />
                        </DangerEuiContextMenuItem>
                      );
                    }}
                  </PackagePolicyDeleteProvider>,
                ]}
              />
            ),
          },
        ],
      },
    ],
    [agentPolicy, getHref, hasWriteCapabilities, refreshAgentPolicy]
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
        toolsRight: [
          <EuiButton
            key="addPackagePolicyButton"
            isDisabled={!hasWriteCapabilities}
            iconType="plusInCircle"
            href={getHref('add_integration_from_policy', { policyId: agentPolicy.id })}
          >
            <FormattedMessage
              id="xpack.ingestManager.policyDetails.addPackagePolicyButtonText"
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
          },
          {
            type: 'field_value_selection',
            field: 'inputTypes',
            name: 'Input types',
            options: inputTypes,
            multiSelect: 'or',
          },
        ],
      }}
      isSelectable={false}
    />
  );
};
