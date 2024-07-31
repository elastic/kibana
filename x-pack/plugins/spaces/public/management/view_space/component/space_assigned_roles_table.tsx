/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiInMemoryTable,
  EuiPopover,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiInMemoryTableProps,
  EuiSearchBarProps,
  EuiTableFieldDataColumnType,
  EuiTableSelectionType,
} from '@elastic/eui';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';
import type { Role } from '@kbn/security-plugin-types-common';

interface ISpaceAssignedRolesTableProps {
  isReadOnly: boolean;
  assignedRoles: Role[];
  onAssignNewRoleClick: () => Promise<void>;
}

/**
 * @description checks if the passed role qualifies as one that can
 * be edited by a user with sufficient permissions
 */
export const isEditableRole = (role: Role) => {
  return !(
    role.metadata?._reserved ||
    role.kibana.reduce((acc, cur) => {
      return cur.spaces.includes('*') || acc;
    }, false)
  );
};

const getTableColumns = ({ isReadOnly }: Pick<ISpaceAssignedRolesTableProps, 'isReadOnly'>) => {
  const columns: Array<EuiBasicTableColumn<Role>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.spaces.management.spaceDetails.rolesTable.column.name.title', {
        defaultMessage: 'Role',
      }),
    },
    {
      field: 'privileges',
      name: i18n.translate(
        'xpack.spaces.management.spaceDetails.rolesTable.column.privileges.title',
        {
          defaultMessage: 'Privileges',
        }
      ),
      render: (_, record) => {
        return record.kibana.map((kibanaPrivilege) => {
          return kibanaPrivilege.base.join(', ');
        });
      },
    },
    {
      field: 'metadata',
      name: i18n.translate(
        'xpack.spaces.management.spaceDetails.rolesTable.column.roleType.title',
        {
          defaultMessage: 'Role type',
        }
      ),
      render: (_value: Role['metadata']) => {
        return React.createElement(EuiBadge, {
          children: _value?._reserved
            ? i18n.translate(
                'xpack.spaces.management.spaceDetails.rolesTable.column.roleType.reserved',
                {
                  defaultMessage: 'Reserved',
                }
              )
            : i18n.translate(
                'xpack.spaces.management.spaceDetails.rolesTable.column.roleType.custom',
                {
                  defaultMessage: 'Custom',
                }
              ),
          color: _value?._reserved ? undefined : 'success',
        });
      },
    },
  ];

  if (!isReadOnly) {
    columns.push({
      name: 'Actions',
      actions: [
        {
          type: 'icon',
          icon: 'lock',
          href: '#',
          target: '_self',
          name: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.reservedIndictor.title',
            {
              defaultMessage: 'Reserved',
            }
          ),
          description: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.reservedIndictor.description',
            {
              defaultMessage: 'No action to perform, this role is reserved',
            }
          ),
          isPrimary: true,
          enabled: () => false,
          available: (rowRecord) => !isEditableRole(rowRecord),
        },
        {
          type: 'icon',
          icon: 'pencil',
          name: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.edit.title',
            {
              defaultMessage: 'Remove from space',
            }
          ),
          isPrimary: true,
          description: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.edit.description',
            {
              defaultMessage:
                'Click this action to edit the role privileges of this user for this space.',
            }
          ),
          showOnHover: true,
          available: (rowRecord) => isEditableRole(rowRecord),
          onClick: () => {
            window.alert('Not yet implemented.');
          },
        },
        {
          isPrimary: true,
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          name: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.remove.title',
            {
              defaultMessage: 'Remove from space',
            }
          ),
          description: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.edit.description',
            {
              defaultMessage: 'Click this action to remove the user from this space.',
            }
          ),
          showOnHover: true,
          available: (rowRecord) => isEditableRole(rowRecord),
          onClick: (rowRecord, event) => {
            window.alert('Not yet implemented.');
          },
        },
      ],
    });
  }

  return columns;
};

const getRowProps = (item: Role) => {
  const { name } = item;
  return {
    'data-test-subj': `space-role-row-${name}`,
    onClick: () => {},
  };
};

const getCellProps = (item: Role, column: EuiTableFieldDataColumnType<Role>) => {
  const { name } = item;
  const { field } = column;
  return {
    'data-test-subj': `space-role-cell-${name}-${String(field)}`,
    textOnly: true,
  };
};

export const SpaceAssignedRolesTable = ({
  isReadOnly,
  assignedRoles,
  onAssignNewRoleClick,
}: ISpaceAssignedRolesTableProps) => {
  const tableColumns = useMemo(() => getTableColumns({ isReadOnly }), [isReadOnly]);
  const [rolesInView, setRolesInView] = useState<Role[]>(assignedRoles);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [isBulkActionContextOpen, setBulkActionContextOpen] = useState(false);
  const selectableRoles = useRef(rolesInView.filter((role) => isEditableRole(role)));
  const [pagination, setPagination] = useState<CriteriaWithPagination<Role>['page']>({
    index: 0,
    size: 10,
  });

  const onSearchQueryChange = useCallback<NonNullable<NonNullable<EuiSearchBarProps['onChange']>>>(
    ({ query }) => {
      if (query?.text) {
        setRolesInView(
          assignedRoles.filter((role) => role.name.includes(query.text.toLowerCase()))
        );
      } else {
        setRolesInView(assignedRoles);
      }
    },
    [assignedRoles]
  );

  const searchElementDefinition = useMemo<EuiSearchBarProps>(() => {
    return {
      box: {
        incremental: true,
        placeholder: i18n.translate(
          'xpack.spaces.management.spaceDetails.roles.searchField.placeholder',
          { defaultMessage: 'Search' }
        ),
      },
      onChange: onSearchQueryChange,
      toolsRight: (
        <>
          {!isReadOnly && (
            <EuiFlexItem grow={false} color="primary">
              <EuiButton iconType="plusInCircle" onClick={onAssignNewRoleClick}>
                {i18n.translate('xpack.spaces.management.spaceDetails.roles.assign', {
                  defaultMessage: 'Assign role',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
        </>
      ),
    };
  }, [isReadOnly, onAssignNewRoleClick, onSearchQueryChange]);

  const tableHeader = useMemo<EuiInMemoryTableProps<Role>['childrenBetween']>(() => {
    const pageSize = pagination.size;
    const pageIndex = pagination.index;

    return (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexStart" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <span>
                  <EuiTextColor color="subdued">
                    {i18n.translate(
                      'xpack.spaces.management.spaceDetails.rolesTable.selectedStatusInfo',
                      {
                        defaultMessage:
                          'Showing: {pageItemLength} of {rolesInViewCount} | Selected: {selectedCount} roles',
                        values: {
                          pageItemLength: Math.floor(
                            rolesInView.length / (pageSize * (pageIndex + 1))
                          )
                            ? pageSize * (pageIndex + 1)
                            : rolesInView.length % pageSize,
                          rolesInViewCount: rolesInView.length,
                          selectedCount: selectedRoles.length,
                        },
                      }
                    )}
                  </EuiTextColor>
                </span>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiButtonEmpty
                    disabled={!selectedRoles.length}
                    iconSide="right"
                    onClick={setBulkActionContextOpen.bind(null, true)}
                    iconType="arrowDown"
                  >
                    {i18n.translate(
                      'xpack.spaces.management.spaceDetails.rolesTable.bulkActions.contextMenuOpener',
                      {
                        defaultMessage: 'Bulk actions',
                      }
                    )}
                  </EuiButtonEmpty>
                }
                isOpen={isBulkActionContextOpen}
                closePopover={setBulkActionContextOpen.bind(null, false)}
                anchorPosition="downCenter"
              >
                <EuiContextMenu
                  size="s"
                  initialPanelId={0}
                  panels={[
                    {
                      id: 0,
                      items: [
                        {
                          icon: <EuiIcon type="pencil" />,
                          name: i18n.translate(
                            'xpack.spaces.management.spaceDetails.rolesTable.bulkActions.editPrivilege',
                            {
                              defaultMessage: 'Edit privileges',
                            }
                          ),
                          onClick: () => {},
                        },
                        {
                          icon: <EuiIcon type="trash" color="danger" />,
                          name: i18n.translate(
                            'xpack.spaces.management.spaceDetails.rolesTable.bulkActions.remove',
                            {
                              defaultMessage: 'Remove from space',
                            }
                          ),
                          onClick: () => {},
                        },
                      ],
                    },
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
            {Boolean(selectableRoles.current.length) && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="pagesSelect"
                  onClick={setSelectedRoles.bind(null, selectableRoles.current)}
                >
                  {i18n.translate(
                    'xpack.spaces.management.spaceDetails.rolesTable.selectAllRoles',
                    {
                      defaultMessage:
                        'Select {count, plural, one {role} other {all {count} roles}}',
                      values: {
                        count: selectableRoles.current.length,
                      },
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" style={{ height: 1 }} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [isBulkActionContextOpen, pagination, rolesInView, selectedRoles]);

  const onTableChange = ({ page }: CriteriaWithPagination<Role>) => {
    setPagination(page);
  };

  const onSelectionChange = (selection: Role[]) => {
    setSelectedRoles(selection);
  };

  const selection: EuiTableSelectionType<Role> = {
    selected: selectedRoles,
    selectable: (role: Role) => isEditableRole(role),
    selectableMessage: (selectable: boolean, role: Role) =>
      !selectable ? `${role.name} is reserved` : `Select ${role.name}`,
    onSelectionChange,
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiInMemoryTable<Role>
          search={searchElementDefinition}
          childrenBetween={tableHeader}
          itemId="name"
          columns={tableColumns}
          items={rolesInView}
          rowProps={getRowProps}
          cellProps={getCellProps}
          selection={selection}
          pagination={{
            pageSize: pagination.size,
            pageIndex: pagination.index,
            pageSizeOptions: [50, 25, 10, 0],
          }}
          onChange={onTableChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
