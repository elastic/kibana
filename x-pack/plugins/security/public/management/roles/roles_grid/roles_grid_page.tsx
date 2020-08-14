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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { NotificationsStart } from 'src/core/public';
import { ScopedHistory } from 'kibana/public';
import {
  Role,
  isRoleEnabled,
  isRoleReadOnly,
  isRoleReserved,
  isRoleDeprecated,
  getExtendedRoleDeprecationNotice,
} from '../../../../common/model';
import { RolesAPIClient } from '../roles_api_client';
import { ConfirmDelete } from './confirm_delete';
import { PermissionDenied } from './permission_denied';
import { DisabledBadge, DeprecatedBadge, ReservedBadge } from '../../badges';
import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  notifications: NotificationsStart;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  history: ScopedHistory;
}

interface State {
  roles: Role[];
  visibleRoles: Role[];
  selection: Role[];
  filter: string;
  showDeleteConfirmation: boolean;
  permissionDenied: boolean;
  includeReservedRoles: boolean;
}

const getRoleManagementHref = (action: 'edit' | 'clone', roleName?: string) => {
  return `/${action}${roleName ? `/${roleName}` : ''}`;
};

export class RolesGridPage extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      roles: [],
      visibleRoles: [],
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
            <EuiButton
              data-test-subj="createRoleButton"
              {...reactRouterNavigate(this.props.history, getRoleManagementHref('edit'))}
            >
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
              rolesToDelete={this.state.selection.map((role) => role.name)}
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
              items={this.state.visibleRoles}
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
                    visibleRoles: this.getVisibleRoles(
                      this.state.roles,
                      query.queryText,
                      this.state.includeReservedRoles
                    ),
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
              <EuiLink
                data-test-subj="roleRowName"
                {...reactRouterNavigate(this.props.history, getRoleManagementHref('edit', name))}
              >
                {name}
              </EuiLink>
            </EuiText>
          );
        },
      },
      {
        field: 'metadata',
        name: i18n.translate('xpack.security.management.roles.statusColumnName', {
          defaultMessage: 'Status',
        }),
        sortable: (role: Role) => isRoleEnabled(role) && !isRoleDeprecated(role),
        render: (metadata: Role['metadata'], record: Role) => {
          return this.getRoleStatusBadges(record);
        },
      },
      {
        name: i18n.translate('xpack.security.management.roles.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        width: '150px',
        actions: [
          {
            available: (role: Role) => !isRoleReadOnly(role),
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
                  {...reactRouterNavigate(
                    this.props.history,
                    getRoleManagementHref('edit', role.name)
                  )}
                />
              );
            },
          },
          {
            available: (role: Role) => !isRoleReserved(role),
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
                  {...reactRouterNavigate(
                    this.props.history,
                    getRoleManagementHref('clone', role.name)
                  )}
                />
              );
            },
          },
        ],
      },
    ] as Array<EuiBasicTableColumn<Role>>;
  };

  private getVisibleRoles = (roles: Role[], filter: string, includeReservedRoles: boolean) => {
    return roles.filter((role) => {
      const normalized = `${role.name}`.toLowerCase();
      const normalizedQuery = filter.toLowerCase();
      return (
        normalized.indexOf(normalizedQuery) !== -1 &&
        (includeReservedRoles || !isRoleReserved(role))
      );
    });
  };

  private onIncludeReservedRolesChange = (e: EuiSwitchEvent) => {
    this.setState({
      includeReservedRoles: e.target.checked,
      visibleRoles: this.getVisibleRoles(this.state.roles, this.state.filter, e.target.checked),
    });
  };

  private getRoleStatusBadges = (role: Role) => {
    const enabled = isRoleEnabled(role);
    const deprecated = isRoleDeprecated(role);
    const reserved = isRoleReserved(role);

    const badges = [];
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

  private handleDelete = () => {
    this.setState({
      selection: [],
      showDeleteConfirmation: false,
    });
    this.loadRoles();
  };

  private async loadRoles() {
    try {
      const roles = await this.props.rolesAPIClient.getRoles();

      this.setState({
        roles,
        visibleRoles: this.getVisibleRoles(
          roles,
          this.state.filter,
          this.state.includeReservedRoles
        ),
      });
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
        data-test-subj="showReservedRolesSwitch"
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
