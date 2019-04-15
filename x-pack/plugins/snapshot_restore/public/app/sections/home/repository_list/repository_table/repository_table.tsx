/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';

import { REPOSITORY_TYPES } from '../../../../../../common/constants';
import { Repository, RepositoryType, RepositoryVerification } from '../../../../../../common/types';
import { RepositoryDeleteProvider, RepositoryVerificationBadge } from '../../../../components';
import { BASE_PATH } from '../../../../constants';
import { useAppDependencies } from '../../../../index';
import { textService } from '../../../../services/text';

interface Props extends RouteComponentProps {
  repositories: Repository[];
  verification: { [key: string]: RepositoryVerification };
  reload: () => Promise<void>;
  openRepositoryDetails: (name: Repository['name']) => void;
  onRepositoryDeleted: (repositoriesDeleted: Array<Repository['name']>) => void;
}

const RepositoryTableUi: React.FunctionComponent<Props> = ({
  repositories,
  verification,
  reload,
  openRepositoryDetails,
  onRepositoryDeleted,
  history,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const [selectedItems, setSelectedItems] = useState<Repository[]>([]);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.snapshotRestore.repositoryList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
      render: (name: Repository['name'], repository: Repository) => {
        return <EuiLink onClick={() => openRepositoryDetails(name)}>{name}</EuiLink>;
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
      field: 'name',
      name: i18n.translate(
        'xpack.snapshotRestore.repositoryList.table.verificationStatusColumnTitle',
        {
          defaultMessage: 'Status',
        }
      ),
      truncateText: true,
      render: (name: Repository['name']) => (
        <RepositoryVerificationBadge verificationResults={verification[name] || null} />
      ),
    },
    {
      name: i18n.translate('xpack.snapshotRestore.repositoryList.table.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ name, isConfiguredByNode }) => {
            const label = i18n.translate('xpack.snapshotRestore.repositoryList.table.actionEditButton', {
              defaultMessage: 'Edit',
            });

            return (
              <EuiToolTip
                content={label}
                delay="long"
              >
                <EuiButtonIcon
                  aria-label={label}
                  iconType="pencil"
                  color="primary"
                  href={`#${BASE_PATH}/edit_repository/${name}`}
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
                  return (
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.snapshotRestore.repositoryList.table.actionRemoveDescription',
                        {
                          defaultMessage: 'Remove repository',
                        }
                      )}
                      iconType="trash"
                      color="danger"
                      data-test-subj="srRepositoryListDeleteActionButton"
                      onClick={() => deleteRepositoryPrompt([name], onRepositoryDeleted)}
                    />
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
          <EuiButton color="secondary" iconType="refresh" onClick={reload}>
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
            data-test-subj="srRepositoriesAddButton"
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
        'data-test-subj': 'srRepositoryListTableRow',
      })}
      cellProps={(item: any, column: any) => ({
        'data-test-subj': `srRepositoryListTableCell-${column.field}`,
      })}
    />
  );
};

export const RepositoryTable = withRouter(RepositoryTableUi);
