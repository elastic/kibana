/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiSwitchEvent,
  Query,
} from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSearchBar,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import type { FC } from 'react';

import type { BuildFlavor } from '@kbn/config';
import type { NotificationsStart, ScopedHistory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { ConfirmDelete } from './confirm_delete';
import { PermissionDenied } from './permission_denied';
import type { StartServices } from '../../..';
import type { Role } from '../../../../common';
import {
  getExtendedRoleDeprecationNotice,
  isRoleDeprecated,
  isRoleEnabled,
  isRoleReadOnly,
  isRoleReserved,
} from '../../../../common/model';
import { DeprecatedBadge, DisabledBadge, ReservedBadge } from '../../badges';
import type { RolesAPIClient } from '../roles_api_client';

export interface Props extends StartServices {
  notifications: NotificationsStart;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  history: ScopedHistory;
  readOnly?: boolean;
  buildFlavor: BuildFlavor;
  cloudOrgUrl?: string;
}

interface RolesTableState {
  query: Query;
  from: number;
  size: number;
}

const getRoleManagementHref = (action: 'edit' | 'clone', roleName?: string) => {
  return `/${action}${roleName ? `/${encodeURIComponent(roleName)}` : ''}`;
};

const getVisibleRoles = (roles: Role[], filter: string, includeReservedRoles: boolean) => {
  return roles.filter((role) => {
    const normalized = `${role.name}`.toLowerCase();
    const normalizedQuery = filter.toLowerCase();
    return (
      normalized.indexOf(normalizedQuery) !== -1 && (includeReservedRoles || !isRoleReserved(role))
    );
  });
};

const DEFAULT_TABLE_STATE = {
  query: EuiSearchBar.Query.MATCH_ALL,
  sort: {
    field: 'creation' as const,
    direction: 'desc' as const,
  },
  from: 0,
  size: 25,
  filters: {},
};

export const RolesGridPage: FC<Props> = ({
  notifications,
  rolesAPIClient,
  history,
  readOnly,
  buildFlavor,
  cloudOrgUrl,
  analytics,
  theme,
  i18n: i18nStart,
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [visibleRoles, setVisibleRoles] = useState<Role[]>([]);
  const [selection, setSelection] = useState<Role[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [includeReservedRoles, setIncludeReservedRoles] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tableState, setTableState] = useState<RolesTableState>(DEFAULT_TABLE_STATE);

  useEffect(() => {
    loadRoles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const rolesFromApi = await rolesAPIClient.getRoles();
      setRoles(rolesFromApi);
      setVisibleRoles(getVisibleRoles(rolesFromApi, filter, includeReservedRoles));
    } catch (e) {
      if (_.get(e, 'body.statusCode') === 403) {
        setPermissionDenied(true);
      } else {
        notifications.toasts.addDanger(
          i18n.translate('xpack.security.management.roles.fetchingRolesErrorMessage', {
            defaultMessage: 'Error fetching roles: {message}',
            values: { message: _.get(e, 'body.message', '') },
          })
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onIncludeReservedRolesChange = (e: EuiSwitchEvent) => {
    setIncludeReservedRoles(e.target.checked);
    setVisibleRoles(getVisibleRoles(roles, filter, e.target.checked));
  };

  const getRoleStatusBadges = (role: Role) => {
    const enabled = isRoleEnabled(role);
    const deprecated = isRoleDeprecated(role);
    const reserved = isRoleReserved(role);

    const badges: JSX.Element[] = [];
    if (!enabled) {
      badges.push(<DisabledBadge data-test-subj="roleDisabled" />);
    }
    if (reserved) {
      badges.push(
        <ReservedBadge
          data-test-subj="roleReserved"
          tooltipContent={
            <FormattedMessage
              id="xpack.security.management.roles.reservedRoleBadgeTooltip"
              defaultMessage="Reserved roles are built-in and cannot be edited or removed."
            />
          }
        />
      );
    }
    if (deprecated) {
      badges.push(
        <DeprecatedBadge
          data-test-subj="roleDeprecated"
          tooltipContent={getExtendedRoleDeprecationNotice(role)}
        />
      );
    }

    return (
      <EuiFlexGroup gutterSize="s">
        {badges.map((badge, index) => (
          <EuiFlexItem key={index} grow={false}>
            {badge}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  };

  const handleDelete = () => {
    setSelection([]);
    setShowDeleteConfirmation(false);
    loadRoles();
  };

  const deleteOneRole = (roleToDelete: Role) => {
    setSelection([roleToDelete]);
    setShowDeleteConfirmation(true);
  };

  const renderToolsLeft = () => {
    if (selection.length === 0) {
      return;
    }
    const numSelected = selection.length;
    return (
      <EuiButton
        data-test-subj="deleteRoleButton"
        color="danger"
        onClick={() => setShowDeleteConfirmation(true)}
      >
        <FormattedMessage
          id="xpack.security.management.roles.deleteSelectedRolesButtonLabel"
          defaultMessage="Delete {numSelected} role{numSelected, plural, one { } other {s}}"
          values={{
            numSelected,
          }}
        />
      </EuiButton>
    );
  };

  const renderToolsRight = () => {
    if (buildFlavor !== 'serverless') {
      return (
        <EuiSwitch
          data-test-subj="showReservedRolesSwitch"
          label={
            <FormattedMessage
              id="xpack.security.management.roles.showReservedRolesLabel"
              defaultMessage="Show reserved roles"
            />
          }
          checked={includeReservedRoles}
          onChange={onIncludeReservedRolesChange}
        />
      );
    }
  };

  const onTableChange = ({ page, sort }: CriteriaWithPagination<Role>) => {
    const newState = {
      ...tableState,
      from: page?.index! * page?.size!,
      size: page?.size!,
    };
    setTableState(newState);
  };

  const getColumnConfig = (): Array<EuiBasicTableColumn<Role>> => {
    const config: Array<EuiBasicTableColumn<Role>> = [
      {
        field: 'name',
        name: i18n.translate('xpack.security.management.roles.nameColumnName', {
          defaultMessage: 'Role',
        }),
        sortable: true,
        render: (name: string) => (
          <EuiText color="subdued" size="s">
            <EuiLink
              data-test-subj="roleRowName"
              {...reactRouterNavigate(history, getRoleManagementHref('edit', name))}
            >
              {name}
            </EuiLink>
          </EuiText>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('xpack.security.management.roles.descriptionColumnName', {
          defaultMessage: 'Role Description',
        }),
        sortable: true,
        truncateText: { lines: 3 },
        render: (description: string, record: Role) => (
          <EuiToolTip position="top" content={description} display="block">
            <EuiText color="subdued" size="s" data-test-subj={`roleRowDescription-${record.name}`}>
              {description}
            </EuiText>
          </EuiToolTip>
        ),
      },
    ];
    if (buildFlavor !== 'serverless') {
      config.push({
        field: 'metadata',
        name: i18n.translate('xpack.security.management.roles.statusColumnName', {
          defaultMessage: 'Status',
        }),
        sortable: (role: Role) => isRoleEnabled(role) && !isRoleDeprecated(role),
        render: (_metadata: Role['metadata'], record: Role) => getRoleStatusBadges(record),
      });
    }

    if (!readOnly) {
      config.push({
        name: i18n.translate('xpack.security.management.roles.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        width: '150px',
        actions: [
          {
            type: 'icon',
            icon: 'copy',
            isPrimary: true,
            available: (role: Role) => !isRoleReserved(role),
            name: i18n.translate('xpack.security.management.roles.cloneRoleActionName', {
              defaultMessage: 'Clone',
            }),
            description: (role: Role) =>
              i18n.translate('xpack.security.management.roles.cloneRoleActionLabel', {
                defaultMessage: 'Clone {roleName}',
                values: { roleName: role.name },
              }),
            href: (role: Role) =>
              reactRouterNavigate(history, getRoleManagementHref('clone', role.name)).href,
            onClick: (role: Role, event: React.MouseEvent) =>
              reactRouterNavigate(history, getRoleManagementHref('clone', role.name)).onClick(
                event
              ),
            'data-test-subj': (role: Role) => `clone-role-action-${role.name}`,
          },
          {
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            name: i18n.translate('xpack.security.management.roles.deleteRoleActionName', {
              defaultMessage: 'Delete',
            }),
            description: (role: Role) =>
              i18n.translate('xpack.security.management.roles.deleteRoleActionLabel', {
                defaultMessage: `Delete {roleName}`,
                values: { roleName: role.name },
              }),
            'data-test-subj': (role: Role) => `delete-role-action-${role.name}`,
            onClick: (role: Role) => deleteOneRole(role),
            available: (role: Role) => !role.metadata || !role.metadata._reserved,
          },
          {
            isPrimary: true,
            type: 'icon',
            icon: 'pencil',
            name: i18n.translate('xpack.security.management.roles.editRoleActionName', {
              defaultMessage: 'Edit',
            }),
            description: (role: Role) =>
              i18n.translate('xpack.security.management.roles.editRoleActionLabel', {
                defaultMessage: `Edit {roleName}`,
                values: { roleName: role.name },
              }),
            'data-test-subj': (role: Role) => `edit-role-action-${role.name}`,
            href: (role: Role) =>
              reactRouterNavigate(history, getRoleManagementHref('edit', role.name)).href,
            onClick: (role: Role, event: React.MouseEvent) =>
              reactRouterNavigate(history, getRoleManagementHref('edit', role.name)).onClick(event),
            available: (role: Role) => !isRoleReadOnly(role),
            enabled: () => selection.length === 0,
          },
        ],
      });
    }

    return config;
  };

  const onCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const pagination = {
    pageIndex: tableState.from / tableState.size,
    pageSize: tableState.size,
    totalItemCount: visibleRoles.length,
    pageSizeOptions: [25, 50, 100],
  };
  return permissionDenied ? (
    <PermissionDenied />
  ) : (
    <>
      <KibanaPageTemplate.Header
        bottomBorder
        data-test-subj="rolesGridPageHeader"
        pageTitle={
          buildFlavor === 'serverless' ? (
            <FormattedMessage
              id="xpack.security.management.roles.customRoleTitle"
              defaultMessage="Custom Roles"
            />
          ) : (
            <FormattedMessage
              id="xpack.security.management.roles.roleTitle"
              defaultMessage="Roles"
            />
          )
        }
        description={
          buildFlavor === 'serverless' ? (
            <FormattedMessage
              id="xpack.security.management.roles.customRolesSubtitle"
              defaultMessage="In addition to the predefined roles on the system, you can create your own roles and provide your users with the exact set of privileges that they need."
            />
          ) : (
            <FormattedMessage
              id="xpack.security.management.roles.subtitle"
              defaultMessage="Apply roles to groups of users and manage permissions across the stack."
            />
          )
        }
        rightSideItems={
          readOnly
            ? undefined
            : [
                <EuiButton
                  data-test-subj="createRoleButton"
                  {...reactRouterNavigate(history, getRoleManagementHref('edit'))}
                  fill
                  iconType="plusInCircleFilled"
                >
                  <FormattedMessage
                    id="xpack.security.management.roles.createRoleButtonLabel"
                    defaultMessage="Create role"
                  />
                </EuiButton>,
                buildFlavor === 'serverless' && (
                  <EuiButtonEmpty
                    href={cloudOrgUrl}
                    target="_blank"
                    iconSide="right"
                    iconType="popout"
                  >
                    <FormattedMessage
                      id="xpack.security.management.roles.assignRolesLinkLabel"
                      defaultMessage="Assign roles"
                    />
                  </EuiButtonEmpty>
                ),
              ]
        }
      />

      <EuiSpacer size="l" />
      <KibanaPageTemplate.Section paddingSize="none">
        {showDeleteConfirmation ? (
          <ConfirmDelete
            onCancel={onCancelDelete}
            rolesToDelete={selection.map((role) => role.name)}
            callback={handleDelete}
            cloudOrgUrl={cloudOrgUrl}
            notifications={notifications}
            rolesAPIClient={rolesAPIClient}
            buildFlavor={buildFlavor}
            theme={theme}
            analytics={analytics}
            i18n={i18nStart}
          />
        ) : null}

        <EuiSearchBar
          box={{
            incremental: true,
            'data-test-subj': 'searchRoles',
          }}
          onChange={(query: Record<string, any>) => {
            setFilter(query.queryText);
            setVisibleRoles(getVisibleRoles(roles, query.queryText, includeReservedRoles));
          }}
          toolsLeft={renderToolsLeft()}
          toolsRight={renderToolsRight()}
        />
        <EuiSpacer size="s" />
        <EuiBasicTable
          data-test-subj="rolesTable"
          itemId="name"
          columns={getColumnConfig()}
          selection={
            readOnly
              ? undefined
              : {
                  selectable: (role: Role) => !role.metadata || !role.metadata._reserved,
                  selectableMessage: (selectable: boolean) =>
                    !selectable ? 'Role is reserved' : '',
                  onSelectionChange: (value: Role[]) => setSelection(value),
                  selected: selection,
                }
          }
          onChange={onTableChange}
          pagination={pagination}
          noItemsMessage={
            buildFlavor === 'serverless' ? (
              <FormattedMessage
                id="xpack.security.management.roles.noCustomRolesFound"
                defaultMessage="No custom roles to show"
              />
            ) : (
              <FormattedMessage
                id="xpack.security.management.roles.noRolesFound"
                defaultMessage="No items found"
              />
            )
          }
          items={visibleRoles}
          loading={isLoading}
          sorting={{
            sort: {
              field: 'name',
              direction: 'asc',
            },
          }}
          rowProps={{ 'data-test-subj': 'roleRow' }}
        />
      </KibanaPageTemplate.Section>
    </>
  );
};
