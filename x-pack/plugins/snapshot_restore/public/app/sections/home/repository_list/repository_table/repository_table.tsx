/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';

import { REPOSITORY_TYPES } from '../../../../../../common/constants';
import { Repository, RepositoryType } from '../../../../../../common/types';
import { RepositoryDeleteProvider } from '../../../../components';
import { BASE_PATH, UIM_REPOSITORY_SHOW_DETAILS_CLICK } from '../../../../constants';
import { useAppDependencies } from '../../../../index';
import { textService } from '../../../../services/text';
import { uiMetricService } from '../../../../services/ui_metric';

interface Props extends RouteComponentProps {
  repositories: Repository[];
  managedRepository?: string;
  reload: () => Promise<void>;
  openRepositoryDetailsUrl: (name: Repository['name']) => string;
  onRepositoryDeleted: (repositoriesDeleted: Array<Repository['name']>) => void;
}

const RepositoryTableUi: React.FunctionComponent<Props> = ({
  repositories,
  managedRepository,
  reload,
  openRepositoryDetailsUrl,
  onRepositoryDeleted,
  history,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { trackUiMetric } = uiMetricService;
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
              onClick={() => trackUiMetric(UIM_REPOSITORY_SHOW_DETAILS_CLICK)}
              href={openRepositoryDetailsUrl(name)}
              data-test-subj="repositoryLink"
            >
              {name}
            </EuiLink>
            &nbsp;&nbsp;
            {managedRepository === name ? (
              <EuiBadge color="primary">
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryList.table.managedRepositoryBadgeLabel"
                  defaultMessage="Managed"
                />
              </EuiBadge>
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
              <EuiToolTip content={label} delay="long">
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
                  href={`#${BASE_PATH}/edit_repository/${name}`}
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
                {deleteRepositoryPrompt => {
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
                    <EuiToolTip content={label} delay="long">
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
      direction: 'asc',
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
                  selectedItems.map(repository => repository.name),
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
    ) : (
      undefined
    ),
    toolsRight: (
      <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
        <EuiFlexItem>
          <EuiButton
            color="secondary"
            iconType="refresh"
            onClick={reload}
            data-test-subj="reloadButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryList.table.reloadRepositoriesButton"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            href={history.createHref({
              pathname: `${BASE_PATH}/add_repository`,
            })}
            fill
            iconType="plusInCircle"
            data-test-subj="registerRepositoryButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryList.addRepositoryButtonLabel"
              defaultMessage="Register a repository"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    box: {
      incremental: true,
      schema: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'type',
        name: 'Type',
        multiSelect: false,
        options: Object.keys(
          repositories.reduce((typeMap: any, repository) => {
            typeMap[repository.type] = true;
            return typeMap;
          }, {})
        ).map(type => {
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
      cellProps={(item: any, column: any) => ({
        'data-test-subj': `cell`,
      })}
      data-test-subj="repositoryTable"
    />
  );
};

export const RepositoryTable = withRouter(RepositoryTableUi);
