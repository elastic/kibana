/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import {
  EuiButton,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiText,
  EuiTitle,
  EuiButtonIcon,
  EuiBasicTableColumn,
  EuiSwitchEvent,
  EuiSwitch,
  EuiIconTip,
  EuiToolTip,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { NotificationsStart } from 'src/core/public';
import { getDeprecatedReason } from '../../../../common/model/role';
import {
  Role,
  isRoleEnabled,
  isReadOnlyRole,
  isReservedRole,
  isDeprecatedRole,
} from '../../../../common/model';
import { RolesAPIClient } from '../roles_api_client';
import { ConfirmDelete } from './confirm_delete';
import { PermissionDenied } from './permission_denied';

interface Props {
  notifications: NotificationsStart;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
}

interface State {
  roles: Role[];
  selection: Role[];
  filter: string;
  showDeleteConfirmation: boolean;
  permissionDenied: boolean;
  includeReservedRoles: boolean;
}

const getRoleManagementHref = (action: 'edit' | 'clone', roleName?: string) => {
  return `#/management/security/roles/${action}${roleName ? `/${roleName}` : ''}`;
};

export class RolesGridPage extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      roles: [],
      selection: [],
      filter: '',
      showDeleteConfirmation: false,
      permissionDenied: false,
      includeReservedRoles: true,
    };
  }

  public componentDidMount() {
    this.loadRoles();
  }

  public render() {
    const { permissionDenied } = this.state;

    return permissionDenied ? <PermissionDenied /> : this.getPageContent();
  }

  private getPageContent = () => {
    const { roles } = this.state;
    return (
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.security.management.roles.roleTitle"
                  defaultMessage="Roles"
                />
              </h1>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.security.management.roles.subtitle"
                  defaultMessage="Apply roles to groups of users and manage permissions across the stack."
                />
              </p>
            </EuiText>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            <EuiButton data-test-subj="createRoleButton" href={getRoleManagementHref('edit')}>
              <FormattedMessage
                id="xpack.security.management.roles.createRoleButtonLabel"
                defaultMessage="Create role"
              />
            </EuiButton>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          {this.state.showDeleteConfirmation ? (
            <ConfirmDelete
              onCancel={this.onCancelDelete}
              rolesToDelete={this.state.selection.map(role => role.name)}
              callback={this.handleDelete}
              notifications={this.props.notifications}
              rolesAPIClient={this.props.rolesAPIClient}
            />
          ) : null}

          {
            <EuiInMemoryTable
              itemId="name"
              responsive={false}
              columns={this.getColumnConfig()}
              hasActions={true}
              selection={{
                selectable: (role: Role) => !role.metadata || !role.metadata._reserved,
                selectableMessage: (selectable: boolean) => (!selectable ? 'Role is reserved' : ''),
                onSelectionChange: (selection: Role[]) => this.setState({ selection }),
              }}
              pagination={{
                initialPageSize: 20,
                pageSizeOptions: [10, 20, 30, 50, 100],
              }}
              items={this.getVisibleRoles()}
              loading={roles.length === 0}
              search={{
                toolsLeft: this.renderToolsLeft(),
                toolsRight: this.renderToolsRight(),
                box: {
                  incremental: true,
                },
                onChange: (query: Record<string, any>) => {
                  this.setState({
                    filter: query.queryText,
                  });
                },
              }}
              sorting={{
                sort: {
                  field: 'name',
                  direction: 'asc',
                },
              }}
              rowProps={() => {
                return {
                  'data-test-subj': 'roleRow',
                };
              }}
              isSelectable
            />
          }
        </EuiPageContentBody>
      </EuiPageContent>
    );
  };

  private getColumnConfig = () => {
    const reservedRoleDesc = i18n.translate(
      'xpack.security.management.roles.reservedColumnDescription',
      { defaultMessage: 'Reserved roles are built-in and cannot be edited or removed.' }
    );

    return [
      {
        field: 'name',
        name: i18n.translate('xpack.security.management.roles.nameColumnName', {
          defaultMessage: 'Role',
        }),
        sortable: true,
        truncateText: true,
        render: (name: string, record: Role) => {
          return (
            <EuiText color="subdued" size="s">
              <EuiLink data-test-subj="roleRowName" href={getRoleManagementHref('edit', name)}>
                {name}
              </EuiLink>
            </EuiText>
          );
        },
      },
      {
        field: 'metadata._deprecated',
        name: i18n.translate('xpack.security.management.roles.statusColumnName', {
          defaultMessage: 'Status',
        }),
        sortable: (role: Role) => isRoleEnabled(role) && !isDeprecatedRole(role),
        render: (metadata: Role['metadata'], record: Role) => {
          return this.getRoleStatusBadges(record);
        },
      },
      {
        field: 'metadata',
        name: i18n.translate('xpack.security.management.roles.reservedColumnName', {
          defaultMessage: 'Reserved',
        }),
        sortable: (role: Role) => isReservedRole(role),
        dataType: 'boolean',
        align: 'right',
        description: reservedRoleDesc,
        render: (metadata: Role['metadata'], record: Role) => {
          const isDeprecated = isDeprecatedRole(record);

          const label = isDeprecated
            ? this.getDeprecationText(record)
            : i18n.translate('xpack.security.management.roles.reservedRoleIconLabel', {
                defaultMessage: 'Reserved roles are built-in and cannot be removed or modified.',
              });

          return isReservedRole(record) ? (
            <EuiIconTip
              aria-label={label}
              content={label}
              data-test-subj="reservedRole"
              type={isDeprecated ? 'alert' : 'check'}
            />
          ) : null;
        },
      },
      {
        name: i18n.translate('xpack.security.management.roles.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        width: '150px',
        actions: [
          {
            available: (role: Role) => !isReadOnlyRole(role),
            render: (role: Role) => {
              const title = i18n.translate('xpack.security.management.roles.editRoleActionName', {
                defaultMessage: `Edit {roleName}`,
                values: { roleName: role.name },
              });

              return (
                <EuiButtonIcon
                  aria-label={title}
                  data-test-subj={`edit-role-action-${role.name}`}
                  title={title}
                  color={'primary'}
                  iconType={'pencil'}
                  href={getRoleManagementHref('edit', role.name)}
                />
              );
            },
          },
          {
            available: (role: Role) => !isReservedRole(role),
            render: (role: Role) => {
              const title = i18n.translate('xpack.security.management.roles.cloneRoleActionName', {
                defaultMessage: `Clone {roleName}`,
                values: { roleName: role.name },
              });

              return (
                <EuiButtonIcon
                  aria-label={title}
                  data-test-subj={`clone-role-action-${role.name}`}
                  title={title}
                  color={'primary'}
                  iconType={'copy'}
                  href={getRoleManagementHref('clone', role.name)}
                />
              );
            },
          },
        ],
      },
    ] as Array<EuiBasicTableColumn<Role>>;
  };

  private getVisibleRoles = () => {
    const { roles, filter = '', includeReservedRoles } = this.state;

    return roles.filter(role => {
      const normalized = `${role.name}`.toLowerCase();
      const normalizedQuery = filter.toLowerCase();
      return (
        normalized.indexOf(normalizedQuery) !== -1 &&
        (includeReservedRoles || !isReservedRole(role))
      );
    });
  };

  private onIncludeReservedRolesChange = (e: EuiSwitchEvent) => {
    this.setState({
      includeReservedRoles: e.target.checked,
    });
  };

  private getRoleStatusBadges = (role: Role) => {
    const enabled = isRoleEnabled(role);
    const deprecated = isDeprecatedRole(role);

    const badges = [];
    if (enabled) {
      badges.push(
        <EuiBadge data-test-subj="roleEnabled" color="secondary">
          <FormattedMessage
            id="xpack.security.management.roles.enabledBadge"
            defaultMessage="Enabled"
          />
        </EuiBadge>
      );
    } else {
      badges.push(
        <EuiBadge data-test-subj="roleDisabled" color="hollow">
          <FormattedMessage
            id="xpack.security.management.roles.disabledBadge"
            defaultMessage="Disabled"
          />
        </EuiBadge>
      );
    }
    if (deprecated) {
      badges.push(
        <EuiToolTip content={this.getDeprecationText(role)}>
          <EuiBadge color="warning">
            <FormattedMessage
              id="xpack.security.management.roles.deprecatedBadge"
              defaultMessage="Deprecated"
            />
          </EuiBadge>
        </EuiToolTip>
      );
    }

    return (
      <EuiFlexGroup gutterSize="xs">
        {badges.map((badge, index) => (
          <EuiFlexItem key={index} grow={false}>
            {badge}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  };

  private handleDelete = () => {
    this.setState({
      selection: [],
      showDeleteConfirmation: false,
    });
    this.loadRoles();
  };

  private getDeprecationText = (role: Role) => {
    return i18n.translate('xpack.security.management.roles.deprecationMessage', {
      defaultMessage:
        'This role has been deprecated, and should no longer be assigned to users. {reason}',
      values: {
        reason: getDeprecatedReason(role),
      },
    });
  };

  private async loadRoles() {
    try {
      const roles = await this.props.rolesAPIClient.getRoles();

      this.setState({ roles });
    } catch (e) {
      if (_.get(e, 'body.statusCode') === 403) {
        this.setState({ permissionDenied: true });
      } else {
        this.props.notifications.toasts.addDanger(
          i18n.translate('xpack.security.management.roles.fetchingRolesErrorMessage', {
            defaultMessage: 'Error fetching roles: {message}',
            values: { message: _.get(e, 'body.message', '') },
          })
        );
      }
    }
  }

  private renderToolsLeft() {
    const { selection } = this.state;
    if (selection.length === 0) {
      return;
    }
    const numSelected = selection.length;
    return (
      <EuiButton
        data-test-subj="deleteRoleButton"
        color="danger"
        onClick={() => this.setState({ showDeleteConfirmation: true })}
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
  }
  private renderToolsRight() {
    return (
      <EuiSwitch
        label={
          <FormattedMessage
            id="xpack.security.management.roles.showReservedRolesLabel"
            defaultMessage="Show reserved roles"
          />
        }
        checked={this.state.includeReservedRoles}
        onChange={this.onIncludeReservedRolesChange}
      />
    );
  }
  private onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  };
}
