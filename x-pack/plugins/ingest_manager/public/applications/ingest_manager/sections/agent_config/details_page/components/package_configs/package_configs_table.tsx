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
import { AgentConfig, PackageConfig } from '../../../../../types';
import { PackageIcon, ContextMenuActions } from '../../../../../components';
import { PackageConfigDeleteProvider, DangerEuiContextMenuItem } from '../../../components';
import { useCapabilities, useLink } from '../../../../../hooks';
import { useConfigRefresh } from '../../hooks';

interface InMemoryPackageConfig extends PackageConfig {
  inputTypes: string[];
  packageName?: string;
  packageTitle?: string;
  packageVersion?: string;
}

interface Props {
  packageConfigs: PackageConfig[];
  config: AgentConfig;
  // Pass through props to InMemoryTable
  loading?: EuiInMemoryTableProps<InMemoryPackageConfig>['loading'];
  message?: EuiInMemoryTableProps<InMemoryPackageConfig>['message'];
}

interface FilterOption {
  name: string;
  value: string;
}

const stringSortAscending = (a: string, b: string): number => a.localeCompare(b);
const toFilterOption = (value: string): FilterOption => ({ name: value, value });

export const PackageConfigsTable: React.FunctionComponent<Props> = ({
  packageConfigs: originalPackageConfigs,
  config,
  ...rest
}) => {
  const { getHref } = useLink();
  const hasWriteCapabilities = useCapabilities().write;
  const refreshConfig = useConfigRefresh();

  // With the package configs provided on input, generate the list of package configs
  // used in the InMemoryTable (flattens some values for search) as well as
  // the list of options that will be used in the filters dropdowns
  const [packageConfigs, namespaces, inputTypes] = useMemo((): [
    InMemoryPackageConfig[],
    FilterOption[],
    FilterOption[]
  ] => {
    const namespacesValues: string[] = [];
    const inputTypesValues: string[] = [];
    const mappedPackageConfigs = originalPackageConfigs.map<InMemoryPackageConfig>(
      (packageConfig) => {
        if (packageConfig.namespace && !namespacesValues.includes(packageConfig.namespace)) {
          namespacesValues.push(packageConfig.namespace);
        }

        const dsInputTypes: string[] = [];

        dsInputTypes.sort(stringSortAscending);

        return {
          ...packageConfig,
          inputTypes: dsInputTypes,
          packageName: packageConfig.package?.name ?? '',
          packageTitle: packageConfig.package?.title ?? '',
          packageVersion: packageConfig.package?.version ?? '',
        };
      }
    );

    namespacesValues.sort(stringSortAscending);
    inputTypesValues.sort(stringSortAscending);

    return [
      mappedPackageConfigs,
      namespacesValues.map(toFilterOption),
      inputTypesValues.map(toFilterOption),
    ];
  }, [originalPackageConfigs]);

  const columns = useMemo(
    (): EuiInMemoryTableProps<InMemoryPackageConfig>['columns'] => [
      {
        field: 'name',
        sortable: true,
        name: i18n.translate(
          'xpack.ingestManager.configDetails.packageConfigsTable.nameColumnTitle',
          {
            defaultMessage: 'Name',
          }
        ),
      },
      {
        field: 'description',
        name: i18n.translate(
          'xpack.ingestManager.configDetails.packageConfigsTable.descriptionColumnTitle',
          {
            defaultMessage: 'Description',
          }
        ),
        truncateText: true,
      },
      {
        field: 'packageTitle',
        sortable: true,
        name: i18n.translate(
          'xpack.ingestManager.configDetails.packageConfigsTable.packageNameColumnTitle',
          {
            defaultMessage: 'Integration',
          }
        ),
        render(packageTitle: string, packageConfig: InMemoryPackageConfig) {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {packageConfig.package && (
                <EuiFlexItem grow={false}>
                  <PackageIcon
                    packageName={packageConfig.package.name}
                    version={packageConfig.package.version}
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
          'xpack.ingestManager.configDetails.packageConfigsTable.namespaceColumnTitle',
          {
            defaultMessage: 'Namespace',
          }
        ),
        render: (namespace: InMemoryPackageConfig['namespace']) => {
          return namespace ? <EuiBadge color="hollow">{namespace}</EuiBadge> : '';
        },
      },
      {
        name: i18n.translate(
          'xpack.ingestManager.configDetails.packageConfigsTable.actionsColumnTitle',
          {
            defaultMessage: 'Actions',
          }
        ),
        actions: [
          {
            render: (packageConfig: InMemoryPackageConfig) => (
              <ContextMenuActions
                items={[
                  // FIXME: implement View package config action
                  // <EuiContextMenuItem
                  //   disabled
                  //   icon="inspect"
                  //   onClick={() => {}}
                  //   key="packageConfigView"
                  // >
                  //   <FormattedMessage
                  //     id="xpack.ingestManager.configDetails.packageConfigsTable.viewActionTitle"
                  //     defaultMessage="View integration"
                  //   />
                  // </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    disabled={!hasWriteCapabilities}
                    icon="pencil"
                    href={getHref('edit_integration', {
                      configId: config.id,
                      packageConfigId: packageConfig.id,
                    })}
                    key="packageConfigEdit"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.configDetails.packageConfigsTable.editActionTitle"
                      defaultMessage="Edit integration"
                    />
                  </EuiContextMenuItem>,
                  // FIXME: implement Copy package config action
                  // <EuiContextMenuItem disabled icon="copy" onClick={() => {}} key="packageConfigCopy">
                  //   <FormattedMessage
                  //     id="xpack.ingestManager.configDetails.packageConfigsTable.copyActionTitle"
                  //     defaultMessage="Copy integration"
                  //   />
                  // </EuiContextMenuItem>,
                  <PackageConfigDeleteProvider agentConfig={config} key="packageConfigDelete">
                    {(deletePackageConfigsPrompt) => {
                      return (
                        <DangerEuiContextMenuItem
                          disabled={!hasWriteCapabilities}
                          icon="trash"
                          onClick={() => {
                            deletePackageConfigsPrompt([packageConfig.id], refreshConfig);
                          }}
                        >
                          <FormattedMessage
                            id="xpack.ingestManager.configDetails.packageConfigsTable.deleteActionTitle"
                            defaultMessage="Delete integration"
                          />
                        </DangerEuiContextMenuItem>
                      );
                    }}
                  </PackageConfigDeleteProvider>,
                ]}
              />
            ),
          },
        ],
      },
    ],
    [config, getHref, hasWriteCapabilities, refreshConfig]
  );

  return (
    <EuiInMemoryTable<InMemoryPackageConfig>
      itemId="id"
      items={packageConfigs}
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
            key="addPackageConfigButton"
            isDisabled={!hasWriteCapabilities}
            iconType="plusInCircle"
            href={getHref('add_integration_from_configuration', { configId: config.id })}
          >
            <FormattedMessage
              id="xpack.ingestManager.configDetails.addPackageConfigButtonText"
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
