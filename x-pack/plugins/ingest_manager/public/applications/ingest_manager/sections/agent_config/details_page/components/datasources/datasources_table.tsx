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
  EuiTextColor,
  EuiContextMenuItem,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { AgentConfig, Datasource } from '../../../../../types';
import { TableRowActions } from '../../../components/table_row_actions';
import { DangerEuiContextMenuItem } from '../../../components/danger_eui_context_menu_item';
import { useCapabilities, useLink } from '../../../../../hooks';
import { useAgentConfigLink } from '../../hooks/use_details_uri';
import { DatasourceDeleteProvider } from '../../../components/datasource_delete_provider';
import { useConfigRefresh } from '../../hooks/use_config';
import { PackageIcon } from '../../../../../components/package_icon';

interface InMemoryDatasource extends Datasource {
  streams: { total: number; enabled: number };
  inputTypes: string[];
  packageName?: string;
  packageTitle?: string;
  packageVersion?: string;
}

interface Props {
  datasources: Datasource[];
  config: AgentConfig;
  // Pass through props to InMemoryTable
  loading?: EuiInMemoryTableProps<InMemoryDatasource>['loading'];
  message?: EuiInMemoryTableProps<InMemoryDatasource>['message'];
}

interface FilterOption {
  name: string;
  value: string;
}

const stringSortAscending = (a: string, b: string): number => a.localeCompare(b);
const toFilterOption = (value: string): FilterOption => ({ name: value, value });

export const DatasourcesTable: React.FunctionComponent<Props> = ({
  datasources: originalDatasources,
  config,
  ...rest
}) => {
  const hasWriteCapabilities = useCapabilities().write;
  const addDatasourceLink = useAgentConfigLink('add-datasource', { configId: config.id });
  const editDatasourceLink = useLink(`/configs/${config.id}/edit-datasource`);
  const refreshConfig = useConfigRefresh();

  // With the datasources provided on input, generate the list of datasources
  // used in the InMemoryTable (flattens some values for search) as well as
  // the list of options that will be used in the filters dropdowns
  const [datasources, namespaces, inputTypes] = useMemo((): [
    InMemoryDatasource[],
    FilterOption[],
    FilterOption[]
  ] => {
    const namespacesValues: string[] = [];
    const inputTypesValues: string[] = [];
    const mappedDatasources = originalDatasources.map<InMemoryDatasource>(datasource => {
      if (datasource.namespace && !namespacesValues.includes(datasource.namespace)) {
        namespacesValues.push(datasource.namespace);
      }

      const dsInputTypes: string[] = [];
      const streams = datasource.inputs.reduce(
        (streamSummary, input) => {
          if (!inputTypesValues.includes(input.type)) {
            inputTypesValues.push(input.type);
          }
          if (!dsInputTypes.includes(input.type)) {
            dsInputTypes.push(input.type);
          }

          streamSummary.total += input.streams.length;
          streamSummary.enabled += input.enabled
            ? input.streams.filter(stream => stream.enabled).length
            : 0;

          return streamSummary;
        },
        { total: 0, enabled: 0 }
      );

      dsInputTypes.sort(stringSortAscending);

      return {
        ...datasource,
        streams,
        inputTypes: dsInputTypes,
        packageName: datasource.package?.name ?? '',
        packageTitle: datasource.package?.title ?? '',
        packageVersion: datasource.package?.version ?? '',
      };
    });

    namespacesValues.sort(stringSortAscending);
    inputTypesValues.sort(stringSortAscending);

    return [
      mappedDatasources,
      namespacesValues.map(toFilterOption),
      inputTypesValues.map(toFilterOption),
    ];
  }, [originalDatasources]);

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
            defaultMessage: 'Integration',
          }
        ),
        render(packageTitle: string, datasource: InMemoryDatasource) {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {datasource.package && (
                <EuiFlexItem grow={false}>
                  <PackageIcon
                    packageName={datasource.package.name}
                    version={datasource.package.version}
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
          'xpack.ingestManager.configDetails.datasourcesTable.namespaceColumnTitle',
          {
            defaultMessage: 'Namespace',
          }
        ),
        render: (namespace: InMemoryDatasource['namespace']) => {
          return namespace ? <EuiBadge color="hollow">{namespace}</EuiBadge> : '';
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
        name: i18n.translate(
          'xpack.ingestManager.configDetails.datasourcesTable.actionsColumnTitle',
          {
            defaultMessage: 'Actions',
          }
        ),
        actions: [
          {
            render: (datasource: InMemoryDatasource) => (
              <TableRowActions
                items={[
                  // FIXME: implement View datasource action
                  // <EuiContextMenuItem
                  //   disabled
                  //   icon="inspect"
                  //   onClick={() => {}}
                  //   key="datasourceView"
                  // >
                  //   <FormattedMessage
                  //     id="xpack.ingestManager.configDetails.datasourcesTable.viewActionTitle"
                  //     defaultMessage="View data source"
                  //   />
                  // </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    disabled={!hasWriteCapabilities}
                    icon="pencil"
                    href={`${editDatasourceLink}/${datasource.id}`}
                    key="datasourceEdit"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.configDetails.datasourcesTable.editActionTitle"
                      defaultMessage="Edit data source"
                    />
                  </EuiContextMenuItem>,
                  // FIXME: implement Copy datasource action
                  // <EuiContextMenuItem disabled icon="copy" onClick={() => {}} key="datasourceCopy">
                  //   <FormattedMessage
                  //     id="xpack.ingestManager.configDetails.datasourcesTable.copyActionTitle"
                  //     defaultMessage="Copy data source"
                  //   />
                  // </EuiContextMenuItem>,
                  <DatasourceDeleteProvider agentConfig={config} key="datasourceDelete">
                    {deleteDatasourcePrompt => {
                      return (
                        <DangerEuiContextMenuItem
                          disabled={!hasWriteCapabilities}
                          icon="trash"
                          onClick={() => {
                            deleteDatasourcePrompt([datasource.id], refreshConfig);
                          }}
                        >
                          <FormattedMessage
                            id="xpack.ingestManager.configDetails.datasourcesTable.deleteActionTitle"
                            defaultMessage="Delete data source"
                          />
                        </DangerEuiContextMenuItem>
                      );
                    }}
                  </DatasourceDeleteProvider>,
                ]}
              />
            ),
          },
        ],
      },
    ],
    [config, editDatasourceLink, hasWriteCapabilities, refreshConfig]
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
      search={{
        toolsRight: [
          <EuiButton
            isDisabled={!hasWriteCapabilities}
            iconType="plusInCircle"
            href={addDatasourceLink}
          >
            <FormattedMessage
              id="xpack.ingestManager.configDetails.addDatasourceButtonText"
              defaultMessage="Create data source"
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
