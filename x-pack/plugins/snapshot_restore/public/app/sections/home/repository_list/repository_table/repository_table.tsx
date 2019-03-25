/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
} from '@elastic/eui';
import React, { useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { REPOSITORY_TYPES } from '../../../../../../common/constants';
import { Repository, RepositoryType } from '../../../../../../common/types';
import { RepositoryDeleteProvider, RepositoryTypeName } from '../../../../components';
import { BASE_PATH, Section } from '../../../../constants';
import { useAppDependencies } from '../../../../index';

interface Props extends RouteComponentProps {
  repositories: Repository[];
  reload: () => Promise<void>;
  openRepositoryDetails: (name: Repository['name']) => void;
}

export const RepositoryTableUi: React.FunctionComponent<Props> = ({
  repositories,
  reload,
  openRepositoryDetails,
  history,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const section = 'repositories' as Section;
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
          return (
            <RepositoryTypeName type={type} delegateType={repository.settings.delegate_type} />
          );
        } else {
          return <RepositoryTypeName type={type} />;
        }
      },
    },
    {
      name: i18n.translate('xpack.snapshotRestore.repositoryList.table.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: i18n.translate('xpack.snapshotRestore.repositoryList.table.actionEditButton', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate(
            'xpack.snapshotRestore.repositoryList.table.actionEditDescription',
            {
              defaultMessage: 'Edit repository',
            }
          ),
          icon: 'pencil',
          type: 'icon',
          onClick: () => {
            /* placeholder */
          },
        },
        {
          render: ({ name }: Repository) => {
            return (
              <RepositoryDeleteProvider>
                {(deleteRepository: (names: Array<Repository['name']>) => void) => {
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
                      onClick={() => deleteRepository([name])}
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
        {(deleteRepository: (names: Array<Repository['name']>) => void) => {
          return (
            <EuiButton
              onClick={() => deleteRepository(selectedItems.map(repository => repository.name))}
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
            onClick={() => history.push(`${BASE_PATH}/${section}/add`)}
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
            view: <RepositoryTypeName type={type as RepositoryType} />,
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
