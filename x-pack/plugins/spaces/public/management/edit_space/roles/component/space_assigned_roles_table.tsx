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
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import type { Role } from '@kbn/security-plugin-types-common';

import type { Space } from '../../../../../common';
import { sortRolesForListing } from '../../../lib';

interface ISpaceAssignedRolesTableProps {
  isReadOnly?: boolean;
  currentSpace: Space;
  assignedRoles: Map<Role['name'], Role>;
  onClickAssignNewRole: () => Promise<void>;
  onClickRowEditAction: (role: Role) => void;
  onClickRemoveRoleConfirm: (role: Role) => void;
  supportsBulkAction?: boolean;
  onClickBulkRemove?: (selectedRoles: Role[]) => void;
}

const isRoleReserved = (role: Role) => {
  return role.metadata?._reserved;
};
const isRoleAssignedToAll = (role: Role) => {
  return role.kibana.reduce((acc, cur) => {
    return cur.spaces.includes('*') || acc;
  }, false);
};

/**
 * @description checks if the passed role qualifies as one that can
 * be edited by a user with sufficient permissions
 */
export const isEditableRole = (role: Role) => {
  return !(isRoleReserved(role) || isRoleAssignedToAll(role));
};

const getTableColumns = ({
  isReadOnly,
  currentSpace,
  onClickRowEditAction,
  onClickRemoveRoleConfirm,
}: Pick<
  ISpaceAssignedRolesTableProps,
  'isReadOnly' | 'onClickRowEditAction' | 'onClickRemoveRoleConfirm' | 'currentSpace'
>) => {
  const columns: Array<EuiBasicTableColumn<Role>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.spaces.management.spaceDetails.rolesTable.column.name.title', {
        defaultMessage: 'Role',
      }),
      width: '45%',
    },
    {
      field: 'privileges',
      name: i18n.translate(
        'xpack.spaces.management.spaceDetails.rolesTable.column.privileges.title',
        { defaultMessage: 'Privileges' }
      ),
      render: (_, record) => {
        const uniquePrivilege = new Set(
          record.kibana.reduce((privilegeBaseTuple, kibanaPrivilege) => {
            if (
              kibanaPrivilege.spaces.includes(currentSpace.id) ||
              kibanaPrivilege.spaces.includes('*')
            ) {
              if (!kibanaPrivilege.base.length) {
                privilegeBaseTuple.push(
                  i18n.translate(
                    'xpack.spaces.management.spaceDetails.rolesTable.column.privileges.customPrivilege',
                    { defaultMessage: 'custom' }
                  )
                );
              } else {
                return privilegeBaseTuple.concat(kibanaPrivilege.base);
              }
            }

            return privilegeBaseTuple;
          }, [] as string[])
        );

        return Array.from(uniquePrivilege).join(',');
      },
    },
    {
      field: 'metadata',
      name: i18n.translate(
        'xpack.spaces.management.spaceDetails.rolesTable.column.roleType.title',
        { defaultMessage: 'Role type' }
      ),
      render: (_value: Role['metadata']) => {
        return _value?._reserved
          ? React.createElement(EuiBadge, {
              children: i18n.translate(
                'xpack.spaces.management.spaceDetails.rolesTable.column.roleType.reserved',
                { defaultMessage: 'Reserved' }
              ),
              color: 'primary',
            })
          : null;
      },
    },
  ];

  if (!isReadOnly) {
    columns.push({
      name: i18n.translate(
        'xpack.spaces.management.spaceDetails.rolesTable.column.actions.columnHeaderName',
        { defaultMessage: 'Actions' }
      ),
      actions: [
        {
          type: 'icon',
          icon: 'lock',
          href: '#',
          target: '_self',
          'data-test-subj': 'spaceRoleCellActionLocked',
          name: (role) =>
            isRoleReserved(role)
              ? i18n.translate(
                  'xpack.spaces.management.spaceDetails.rolesTable.column.actions.notEditableTitle.isReserved',
                  { defaultMessage: 'Reserved' }
                )
              : i18n.translate(
                  'xpack.spaces.management.spaceDetails.rolesTable.column.actions.notEditableTitle.isAssignedToAll',
                  { defaultMessage: 'Assigned to all spaces' }
                ),
          description: (role) =>
            isRoleReserved(role)
              ? i18n.translate(
                  'xpack.spaces.management.spaceDetails.rolesTable.column.actions.notEditableDescription.isReserved',
                  { defaultMessage: `You can’t edit the access of reserved roles to this space.` }
                )
              : i18n.translate(
                  'xpack.spaces.management.spaceDetails.rolesTable.column.actions.notEditableDescription.isAssignedToAll',
                  {
                    defaultMessage: `You can't edit the access of a role that is assigned to all spaces.`,
                  }
                ),
          showOnHover: true,
          enabled: () => false,
          available: (rowRecord) => !isEditableRole(rowRecord),
        },
        {
          type: 'icon',
          icon: 'pencil',
          isPrimary: true,
          'data-test-subj': 'spaceRoleCellEditAction',
          name: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.edit.title',
            { defaultMessage: 'Remove from space' }
          ),
          description: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.edit.description',
            {
              defaultMessage:
                'Click this action to edit the role privileges of this user for this space.',
            }
          ),
          available: (rowRecord) => isEditableRole(rowRecord),
          onClick: onClickRowEditAction,
        },
        {
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          isPrimary: true,
          'data-test-subj': 'spaceRoleCellDeleteAction',
          name: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.remove.title',
            { defaultMessage: 'Remove from space' }
          ),
          description: i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.column.actions.edit.description',
            { defaultMessage: 'Click this action to remove the user from this space.' }
          ),
          available: (rowRecord) => isEditableRole(rowRecord),
          onClick: onClickRemoveRoleConfirm,
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
  assignedRoles,
  currentSpace,
  onClickAssignNewRole,
  onClickBulkRemove,
  onClickRowEditAction,
  onClickRemoveRoleConfirm,
  isReadOnly = false,
  supportsBulkAction = false,
}: ISpaceAssignedRolesTableProps) => {
  const tableColumns = useMemo(
    () =>
      getTableColumns({
        isReadOnly,
        onClickRowEditAction,
        onClickRemoveRoleConfirm,
        currentSpace,
      }),
    [currentSpace, isReadOnly, onClickRowEditAction, onClickRemoveRoleConfirm]
  );
  const [rolesInView, setRolesInView] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [isBulkActionContextOpen, setBulkActionContextOpen] = useState(false);
  const [pagination, setPagination] = useState<CriteriaWithPagination<Role>['page']>({
    index: 0,
    size: 10,
  });

  useEffect(() => {
    const valuesFromMap = Array.from(assignedRoles.values());
    const sortedRoles = valuesFromMap.sort(sortRolesForListing);
    setRolesInView(sortedRoles);
  }, [assignedRoles]);

  const onSearchQueryChange = useCallback<NonNullable<NonNullable<EuiSearchBarProps['onChange']>>>(
    ({ query }) => {
      const assignedRolesTransformed = Array.from(assignedRoles.values());
      const sortedAssignedRolesTransformed = assignedRolesTransformed.sort(sortRolesForListing);

      if (query?.text) {
        setRolesInView(
          sortedAssignedRolesTransformed.filter((role) =>
            role.name.includes(query.text.toLowerCase())
          )
        );
      } else {
        setRolesInView(sortedAssignedRolesTransformed);
      }
    },
    [assignedRoles]
  );

  const searchElementDefinition = useMemo<EuiSearchBarProps>(() => {
    return {
      box: {
        fullWidth: false,
        incremental: true,
        'data-test-subj': 'spaceAssignedRolesSearchBox',
        placeholder: i18n.translate(
          'xpack.spaces.management.spaceDetails.roles.searchField.placeholder',
          { defaultMessage: 'Filter assigned roles...' }
        ),
      },
      onChange: onSearchQueryChange,
      toolsRight: (
        <>
          {!isReadOnly && (
            <EuiFlexItem grow={false} color="primary">
              <EuiButton iconType="plusInCircle" onClick={onClickAssignNewRole}>
                {i18n.translate('xpack.spaces.management.spaceDetails.roles.assign', {
                  defaultMessage: 'Assign new roles',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
        </>
      ),
    };
  }, [isReadOnly, onClickAssignNewRole, onSearchQueryChange]);

  const tableHeader = useMemo<EuiInMemoryTableProps<Role>['childrenBetween']>(() => {
    if (!supportsBulkAction) {
      return null;
    }

    const pageSize = pagination.size;
    const pageIndex = pagination.index;

    const selectableRoles = rolesInView.filter((role) => isEditableRole(role) && !isReadOnly);

    return (
      <EuiFlexGroup direction="column" gutterSize="xs">
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
                          'Showing: {pageItemLength} of {rolesInViewCount} | Selected: {selectedCount, plural, one {one role} other {{selectedCount} roles}}',
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
            <React.Fragment>
              {!isReadOnly && (
                <React.Fragment>
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      isOpen={isBulkActionContextOpen}
                      closePopover={setBulkActionContextOpen.bind(null, false)}
                      anchorPosition="downCenter"
                      button={
                        <EuiButtonEmpty
                          size="s"
                          iconSide="right"
                          iconType="arrowDown"
                          disabled={!selectedRoles.length}
                          data-test-subj="bulkActionsContextMenuOpener"
                          onClick={setBulkActionContextOpen.bind(null, true)}
                        >
                          {i18n.translate(
                            'xpack.spaces.management.spaceDetails.rolesTable.bulkActions.contextMenuOpener',
                            { defaultMessage: 'Bulk actions' }
                          )}
                        </EuiButtonEmpty>
                      }
                    >
                      <EuiContextMenu
                        size="s"
                        initialPanelId={0}
                        panels={[
                          {
                            id: 0,
                            size: 's',
                            width: 180,
                            items: [
                              {
                                icon: <EuiIcon type="trash" color="danger" />,
                                name: (
                                  <EuiTextColor color="danger">
                                    {i18n.translate(
                                      'xpack.spaces.management.spaceDetails.rolesTable.bulkActions.remove',
                                      { defaultMessage: 'Remove from space' }
                                    )}
                                  </EuiTextColor>
                                ),
                                onClick: async () => {
                                  onClickBulkRemove?.(selectedRoles);
                                  setBulkActionContextOpen(false);
                                },
                              },
                            ],
                          },
                        ]}
                      />
                    </EuiPopover>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {Boolean(selectableRoles.length) &&
                      React.createElement(EuiButtonEmpty, {
                        size: 's',
                        ...(Boolean(selectedRoles.length)
                          ? {
                              iconType: 'crossInCircle',
                              onClick: setSelectedRoles.bind(null, []),
                              children: i18n.translate(
                                'xpack.spaces.management.spaceDetails.rolesTable.clearRolesSelection',
                                { defaultMessage: 'Clear selection' }
                              ),
                            }
                          : {
                              iconType: 'pagesSelect',
                              onClick: setSelectedRoles.bind(null, selectableRoles),
                              children: i18n.translate(
                                'xpack.spaces.management.spaceDetails.rolesTable.selectAllRoles',
                                {
                                  defaultMessage:
                                    'Select {count, plural, one {role} other {all {count} roles}}',
                                  values: { count: selectableRoles.length },
                                }
                              ),
                            }),
                      })}
                  </EuiFlexItem>
                </React.Fragment>
              )}
            </React.Fragment>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" style={{ height: 1 }} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [
    pagination.size,
    pagination.index,
    rolesInView,
    selectedRoles,
    isReadOnly,
    supportsBulkAction,
    isBulkActionContextOpen,
    onClickBulkRemove,
  ]);

  const onTableChange = ({ page }: CriteriaWithPagination<Role>) => {
    setPagination(page);
  };

  const onSelectionChange = (selection: Role[]) => {
    setSelectedRoles(selection);
  };

  const selection: EuiTableSelectionType<Role> | undefined = useMemo(() => {
    if (!supportsBulkAction) {
      return void 0;
    }

    return {
      selected: selectedRoles,
      selectable: (role) => isEditableRole(role),
      selectableMessage: (_selectable, role) => {
        if (isRoleReserved(role)) {
          return i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.selectableMessage.isReserved',
            { defaultMessage: `You can't select a role that is reserved` }
          );
        }
        if (isRoleAssignedToAll(role)) {
          return i18n.translate(
            'xpack.spaces.management.spaceDetails.rolesTable.selectableMessage.isRoleAssignedToAll',
            { defaultMessage: `You can't select a role that is assigned to all spaces` }
          );
        }

        return i18n.translate(
          'xpack.spaces.management.spaceDetails.rolesTable.selectableMessage.selectRole',
          { defaultMessage: `Select {roleName}`, values: { roleName: role.name } }
        );
      },
      onSelectionChange,
    };
  }, [selectedRoles, supportsBulkAction]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiInMemoryTable<Role>
          data-test-subj="spaceAssignedRolesTable"
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
            pageSizeOptions: [50, 25, 10],
          }}
          onChange={onTableChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
