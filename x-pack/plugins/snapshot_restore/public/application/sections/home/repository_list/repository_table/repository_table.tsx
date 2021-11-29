/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';

import { REPOSITORY_TYPES } from '../../../../../../common';
import { Repository, RepositoryType } from '../../../../../../common/types';
import { UseRequestResponse } from '../../../../../shared_imports';
import { RepositoryDeleteProvider } from '../../../../components';
import { UIM_REPOSITORY_SHOW_DETAILS_CLICK } from '../../../../constants';
import { useServices } from '../../../../app_context';
import { textService } from '../../../../services/text';
import { linkToEditRepository, linkToAddRepository } from '../../../../services/navigation';

import { reactRouterNavigate } from '../../../../../../../../../src/plugins/kibana_react/public';

interface Props {
  repositories: Repository[];
  managedRepository?: string;
  reload: UseRequestResponse['resendRequest'];
  openRepositoryDetailsUrl: (name: Repository['name']) => string;
  onRepositoryDeleted: (repositoriesDeleted: Array<Repository['name']>) => void;
}

export const RepositoryTable: React.FunctionComponent<Props> = ({
  repositories,
  managedRepository,
  reload,
  openRepositoryDetailsUrl,
  onRepositoryDeleted,
}) => {
  const { i18n, uiMetricService, history } = useServices();
  const [selectedItems, setSelectedItems] = useState<Repository[]>([]);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.snapshotRestore.repositoryList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
      render: (name: Repository['name']) => {
        return (
          <Fragment>
            <EuiLink
              {...reactRouterNavigate(history, openRepositoryDetailsUrl(name), () =>
                uiMetricService.trackUiMetric(UIM_REPOSITORY_SHOW_DETAILS_CLICK)
              )}
              data-test-subj="repositoryLink"
            >
              {name}
            </EuiLink>
            &nbsp;&nbsp;
            {managedRepository === name ? (
              <EuiIconTip
                content={
                  <FormattedMessage
                    id="xpack.snapshotRestore.repositoryList.table.managedRepositoryBadgeLabel"
                    defaultMessage="This is a managed repository"
                  />
                }
                position="right"
              />
            ) : null}
          </Fragment>
        );
      },
    },
    {
      field: 'type',
      name: i18n.translate('xpack.snapshotRestore.repositoryList.table.typeColumnTitle', {
        defaultMessage: 'Type',
      }),
      truncateText: true,
      sortable: true,
      render: (type: RepositoryType, repository: Repository) => {
        if (type === REPOSITORY_TYPES.source) {
          return textService.getRepositoryTypeName(type, repository.settings.delegateType);
        }
        return textService.getRepositoryTypeName(type);
      },
    },
    {
      field: 'actions',
      name: i18n.translate('xpack.snapshotRestore.repositoryList.table.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ name }: { name: string }) => {
            const label = i18n.translate(
              'xpack.snapshotRestore.repositoryList.table.actionEditTooltip',
              { defaultMessage: 'Edit' }
            );

            return (
              <EuiToolTip content={label}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.snapshotRestore.repositoryList.table.actionEditAriaLabel',
                    {
                      defaultMessage: 'Edit repository `{name}`',
                      values: { name },
                    }
                  )}
                  iconType="pencil"
                  color="primary"
                  {...reactRouterNavigate(history, linkToEditRepository(name))}
                  data-test-subj="editRepositoryButton"
                />
              </EuiToolTip>
            );
          },
        },
        {
          render: ({ name }: Repository) => {
            return (
              <RepositoryDeleteProvider>
                {(deleteRepositoryPrompt) => {
                  const label =
                    name !== managedRepository
                      ? i18n.translate(
                          'xpack.snapshotRestore.repositoryList.table.actionRemoveTooltip',
                          { defaultMessage: 'Remove' }
                        )
                      : i18n.translate(
                          'xpack.snapshotRestore.repositoryList.table.deleteManagedRepositoryTooltip',
                          {
                            defaultMessage: 'You cannot delete a managed repository.',
                          }
                        );
                  return (
                    <EuiToolTip content={label}>
                      <EuiButtonIcon
                        aria-label={i18n.translate(
                          'xpack.snapshotRestore.repositoryList.table.actionRemoveAriaLabel',
                          {
                            defaultMessage: 'Remove repository `{name}`',
                            values: { name },
                          }
                        )}
                        iconType="trash"
                        color="danger"
                        data-test-subj="deleteRepositoryButton"
                        onClick={() => deleteRepositoryPrompt([name], onRepositoryDeleted)}
                        isDisabled={Boolean(name === managedRepository)}
                      />
                    </EuiToolTip>
                  );
                }}
              </RepositoryDeleteProvider>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  const sorting = {
    sort: {
      field: 'name',
      direction: 'asc' as const,
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const selection = {
    onSelectionChange: (newSelectedItems: Repository[]) => setSelectedItems(newSelectedItems),
    selectable: ({ name }: Repository) => Boolean(name !== managedRepository),
    selectableMessage: (selectable: boolean) => {
      if (!selectable) {
        return i18n.translate(
          'xpack.snapshotRestore.repositoryList.table.deleteManagedRepositoryTooltip',
          {
            defaultMessage: 'You cannot delete a managed repository.',
          }
        );
      }
      return '';
    },
  };

  const search = {
    toolsLeft: selectedItems.length ? (
      <RepositoryDeleteProvider>
        {(
          deleteRepositoryPrompt: (
            names: Array<Repository['name']>,
            onSuccess?: (repositoriesDeleted: Array<Repository['name']>) => void
          ) => void
        ) => {
          return (
            <EuiButton
              onClick={() =>
                deleteRepositoryPrompt(
                  selectedItems.map((repository) => repository.name),
                  onRepositoryDeleted
                )
              }
              color="danger"
              data-test-subj="srRepositoryListBulkDeleteActionButton"
            >
              {selectedItems.length === 1 ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryList.table.deleteSingleRepositoryButton"
                  defaultMessage="Remove repository"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryList.table.deleteMultipleRepositoriesButton"
                  defaultMessage="Remove repositories"
                />
              )}
            </EuiButton>
          );
        }}
      </RepositoryDeleteProvider>
    ) : undefined,
    toolsRight: [
      <EuiButton
        key="reloadButton"
        color="success"
        iconType="refresh"
        onClick={reload}
        data-test-subj="reloadButton"
      >
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryList.table.reloadRepositoriesButton"
          defaultMessage="Reload"
        />
      </EuiButton>,
      <EuiButton
        key="registerRepo"
        {...reactRouterNavigate(
          history,
          // @ts-expect-error
          linkToAddRepository(name)
        )}
        fill
        iconType="plusInCircle"
        data-test-subj="registerRepositoryButton"
      >
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryList.addRepositoryButtonLabel"
          defaultMessage="Register repository"
        />
      </EuiButton>,
    ],
    box: {
      incremental: true,
      schema: true,
    },
    filters: [
      {
        type: 'field_value_selection' as const,
        field: 'type',
        name: i18n.translate('xpack.snapshotRestore.repositoryList.table.typeFilterLabel', {
          defaultMessage: 'Type',
        }),
        multiSelect: false,
        options: Object.keys(
          repositories.reduce((typeMap: any, repository) => {
            typeMap[repository.type] = true;
            return typeMap;
          }, {})
        ).map((type) => {
          return {
            value: type,
            view: textService.getRepositoryTypeName(type),
          };
        }),
      },
    ],
  };

  return (
    <EuiInMemoryTable
      items={repositories}
      itemId="name"
      columns={columns}
      search={search}
      sorting={sorting}
      selection={selection}
      pagination={pagination}
      isSelectable={true}
      rowProps={() => ({
        'data-test-subj': 'row',
      })}
      cellProps={(item, field) => ({
        'data-test-subj': `${field.name}_cell`,
      })}
      data-test-subj="repositoryTable"
    />
  );
};
