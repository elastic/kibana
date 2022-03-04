/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiInMemoryTableProps } from '@elastic/eui';
import {
  EuiInMemoryTable,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';

import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../common';
import { pagePathGetters } from '../../../../../../../constants';
import type { AgentPolicy, InMemoryPackagePolicy, PackagePolicy } from '../../../../../types';
import { PackageIcon, PackagePolicyActionsMenu } from '../../../../../components';
import { useAuthz, useLink, usePackageInstallations, useStartServices } from '../../../../../hooks';
import { pkgKeyFromPackageInfo } from '../../../../../services';

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
  const canWriteIntegrationPolicies = useAuthz().integrations.writeIntegrationPolicies;
  const canReadIntegrationPolicies = useAuthz().integrations.readIntegrationPolicies;
  const { updatableIntegrations } = usePackageInstallations();
  const { getHref } = useLink();

  // With the package policies provided on input, generate the list of package policies
  // used in the InMemoryTable (flattens some values for search) as well as
  // the list of options that will be used in the filters dropdowns
  const [packagePolicies, namespaces] = useMemo((): [InMemoryPackagePolicy[], FilterOption[]] => {
    const namespacesValues: Set<string> = new Set();
    const mappedPackagePolicies = originalPackagePolicies.map<InMemoryPackagePolicy>(
      (packagePolicy) => {
        if (packagePolicy.namespace) {
          namespacesValues.add(packagePolicy.namespace);
        }

        const updatableIntegrationRecord = updatableIntegrations.get(
          packagePolicy.package?.name ?? ''
        );

        const hasUpgrade =
          !!updatableIntegrationRecord &&
          updatableIntegrationRecord.policiesToUpgrade.some(
            ({ pkgPolicyId }) => pkgPolicyId === packagePolicy.id
          );

        return {
          ...packagePolicy,
          packageName: packagePolicy.package?.name ?? '',
          packageTitle: packagePolicy.package?.title ?? '',
          packageVersion: packagePolicy.package?.version ?? '',
          hasUpgrade,
        };
      }
    );

    const namespaceFilterOptions = [...namespacesValues]
      .sort(stringSortAscending)
      .map(toFilterOption);

    return [mappedPackagePolicies, namespaceFilterOptions];
  }, [originalPackagePolicies, updatableIntegrations]);

  const columns = useMemo(
    (): EuiInMemoryTableProps<InMemoryPackagePolicy>['columns'] => [
      {
        field: 'name',
        sortable: true,
        truncateText: true,
        name: i18n.translate('xpack.fleet.policyDetails.packagePoliciesTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        render: (value: string, packagePolicy: InMemoryPackagePolicy) => (
          <EuiLink
            title={value}
            {...(canReadIntegrationPolicies
              ? {
                  href: getHref('edit_integration', {
                    policyId: agentPolicy.id,
                    packagePolicyId: packagePolicy.id,
                  }),
                }
              : { disabled: true })}
          >
            <span className="eui-textTruncate" title={value}>
              {value}
            </span>
            {packagePolicy.description ? (
              <span>
                &nbsp;
                <EuiToolTip content={packagePolicy.description}>
                  <EuiIcon type="help" />
                </EuiToolTip>
              </span>
            ) : null}
          </EuiLink>
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
              <EuiFlexItem data-test-subj="PackagePoliciesTableLink" grow={false}>
                <EuiLink
                  href={
                    packagePolicy.package &&
                    getHref('integration_details_overview', {
                      pkgkey: pkgKeyFromPackageInfo(packagePolicy.package),
                    })
                  }
                >
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
                </EuiLink>
              </EuiFlexItem>
              {packagePolicy.hasUpgrade && (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.fleet.policyDetails.packagePoliciesTable.upgradeAvailable',
                        { defaultMessage: 'Upgrade Available' }
                      )}
                    >
                      <EuiIcon type="alert" color="warning" />
                    </EuiToolTip>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="PackagePoliciesTableUpgradeButton"
                      size="s"
                      minWidth="0"
                      isDisabled={!canWriteIntegrationPolicies}
                      href={`${getHref('upgrade_package_policy', {
                        policyId: agentPolicy.id,
                        packagePolicyId: packagePolicy.id,
                      })}?from=fleet-policy-list`}
                    >
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.packagePoliciesTable.upgradeButton"
                        defaultMessage="Upgrade"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </>
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
              return canWriteIntegrationPolicies ? (
                <PackagePolicyActionsMenu
                  agentPolicy={agentPolicy}
                  packagePolicy={packagePolicy}
                  upgradePackagePolicyHref={`${getHref('upgrade_package_policy', {
                    policyId: agentPolicy.id,
                    packagePolicyId: packagePolicy.id,
                  })}?from=fleet-policy-list`}
                />
              ) : (
                <></>
              );
            },
          },
        ],
      },
    ],
    [agentPolicy, getHref, canWriteIntegrationPolicies, canReadIntegrationPolicies]
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
                fill
                isDisabled={!canWriteIntegrationPolicies}
                iconType="plusInCircle"
                onClick={() => {
                  application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
                    path: pagePathGetters.integrations_all({})[1],
                    state: { forAgentPolicyId: agentPolicy.id },
                  });
                }}
                data-test-subj="addPackagePolicyButton"
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
