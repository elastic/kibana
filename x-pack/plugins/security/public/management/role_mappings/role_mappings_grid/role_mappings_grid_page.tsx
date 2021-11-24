/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiPageHeader,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import React, { Component } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  ApplicationStart,
  DocLinksStart,
  NotificationsStart,
  ScopedHistory,
} from 'src/core/public';

import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import type { Role, RoleMapping } from '../../../../common/model';
import { DisabledBadge, EnabledBadge } from '../../badges';
import {
  EDIT_ROLE_MAPPING_PATH,
  getCloneRoleMappingHref,
  getEditRoleMappingHref,
} from '../../management_urls';
import { RoleTableDisplay } from '../../role_table_display';
import type { RolesAPIClient } from '../../roles';
import { ActionsEuiTableFormatting } from '../../table_utils';
import {
  DeleteProvider,
  NoCompatibleRealms,
  PermissionDenied,
  SectionLoading,
} from '../components';
import type { DeleteRoleMappings } from '../components/delete_provider/delete_provider';
import type { RoleMappingsAPIClient } from '../role_mappings_api_client';
import { EmptyPrompt } from './empty_prompt';
interface Props {
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  roleMappingsAPI: PublicMethodsOf<RoleMappingsAPIClient>;
  notifications: NotificationsStart;
  docLinks: DocLinksStart;
  history: ScopedHistory;
  navigateToApp: ApplicationStart['navigateToApp'];
}

interface State {
  loadState: 'loadingApp' | 'loadingTable' | 'permissionDenied' | 'finished';
  roleMappings: null | RoleMapping[];
  roles: null | Role[];
  selectedItems: RoleMapping[];
  hasCompatibleRealms: boolean;
  error: any;
}

export class RoleMappingsGridPage extends Component<Props, State> {
  private tableRef: React.RefObject<EuiInMemoryTable<RoleMapping>>;
  constructor(props: any) {
    super(props);
    this.state = {
      loadState: 'loadingApp',
      roleMappings: null,
      roles: null,
      hasCompatibleRealms: true,
      selectedItems: [],
      error: undefined,
    };
    this.tableRef = React.createRef();
  }

  public componentDidMount() {
    this.checkPrivileges();
  }

  public render() {
    const { loadState, error, roleMappings } = this.state;

    if (loadState === 'permissionDenied') {
      return <PermissionDenied />;
    }

    if (loadState === 'loadingApp') {
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
          <SectionLoading>
            <FormattedMessage
              id="xpack.security.management.roleMappings.loadingRoleMappingsDescription"
              defaultMessage="Loading role mappings…"
            />
          </SectionLoading>
        </EuiPageContent>
      );
    }

    if (error) {
      const {
        body: { error: errorTitle, message, statusCode },
      } = error;

      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.security.management.roleMappings.loadingRoleMappingsErrorTitle"
                defaultMessage="Error loading Role mappings"
              />
            }
            color="danger"
            iconType="alert"
          >
            {statusCode}: {errorTitle} - {message}
          </EuiCallOut>
        </EuiPageContent>
      );
    }

    if (loadState === 'finished' && roleMappings && roleMappings.length === 0) {
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
          <EmptyPrompt history={this.props.history} />
        </EuiPageContent>
      );
    }

    return (
      <>
        <EuiPageHeader
          bottomBorder
          pageTitle={
            <FormattedMessage
              id="xpack.security.management.roleMappings.roleMappingTitle"
              defaultMessage="Role Mappings"
            />
          }
          description={
            <FormattedMessage
              id="xpack.security.management.roleMappings.roleMappingDescription"
              defaultMessage="Role mappings define which roles are assigned to users from an external identity provider. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink href={this.props.docLinks.links.security.mappingRoles} external={true}>
                    <FormattedMessage
                      id="xpack.security.management.roleMappings.learnMoreLinkText"
                      defaultMessage="Learn more."
                    />
                  </EuiLink>
                ),
              }}
            />
          }
          rightSideItems={[
            <EuiButton
              fill
              iconType="plusInCircleFilled"
              data-test-subj="createRoleMappingButton"
              {...reactRouterNavigate(this.props.history, EDIT_ROLE_MAPPING_PATH)}
            >
              <FormattedMessage
                id="xpack.security.management.roleMappings.createRoleMappingButtonLabel"
                defaultMessage="Create role mapping"
              />
            </EuiButton>,
          ]}
        />

        <EuiSpacer size="l" />

        {!this.state.hasCompatibleRealms && (
          <>
            <NoCompatibleRealms />
            <EuiSpacer />
          </>
        )}
        {this.renderTable()}
      </>
    );
  }

  private renderTable = () => {
    const { roleMappings, selectedItems, loadState } = this.state;

    const message =
      loadState === 'loadingTable' ? (
        <FormattedMessage
          id="xpack.security.management.roleMappings.roleMappingTableLoadingMessage"
          defaultMessage="Loading role mappings…"
        />
      ) : undefined;

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc' as any,
      },
    };

    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50],
    };

    const selection = {
      onSelectionChange: (newSelectedItems: RoleMapping[]) => {
        this.setState({
          selectedItems: newSelectedItems,
        });
      },
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <DeleteProvider
          roleMappingsAPI={this.props.roleMappingsAPI}
          notifications={this.props.notifications}
        >
          {(deleteRoleMappingsPrompt) => {
            return (
              <EuiButton
                onClick={() =>
                  deleteRoleMappingsPrompt(
                    selectedItems,
                    this.onRoleMappingsDeleted,
                    this.onRoleMappingsDeleteCancel
                  )
                }
                color="danger"
                data-test-subj="bulkDeleteActionButton"
              >
                <FormattedMessage
                  id="xpack.security.management.roleMappings.deleteRoleMappingButton"
                  defaultMessage="Delete {count, plural, one {role mapping} other {role mappings}}"
                  values={{
                    count: selectedItems.length,
                  }}
                />
              </EuiButton>
            );
          }}
        </DeleteProvider>
      ) : undefined,
      toolsRight: (
        <EuiButton
          color="success"
          iconType="refresh"
          onClick={() => this.reloadRoleMappings()}
          data-test-subj="reloadButton"
        >
          <FormattedMessage
            id="xpack.security.management.roleMappings.reloadRoleMappingsButton"
            defaultMessage="Reload"
          />
        </EuiButton>
      ),
      box: {
        incremental: true,
      },
      filters: undefined,
    };

    return (
      <DeleteProvider
        roleMappingsAPI={this.props.roleMappingsAPI}
        notifications={this.props.notifications}
      >
        {(deleteRoleMappingPrompt) => {
          return (
            <ActionsEuiTableFormatting>
              <EuiInMemoryTable
                items={roleMappings!}
                itemId="name"
                columns={this.getColumnConfig(deleteRoleMappingPrompt)}
                hasActions={true}
                search={search}
                sorting={sorting}
                selection={selection}
                pagination={pagination}
                loading={loadState === 'loadingTable'}
                message={message}
                isSelectable={true}
                ref={this.tableRef}
                rowProps={() => {
                  return {
                    'data-test-subj': 'roleMappingRow',
                  };
                }}
              />
            </ActionsEuiTableFormatting>
          );
        }}
      </DeleteProvider>
    );
  };

  private getColumnConfig = (deleteRoleMappingPrompt: DeleteRoleMappings) => {
    const config = [
      {
        field: 'name',
        name: i18n.translate('xpack.security.management.roleMappings.nameColumnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (roleMappingName: string) => {
          return (
            <EuiLink
              {...reactRouterNavigate(this.props.history, getEditRoleMappingHref(roleMappingName))}
              data-test-subj="roleMappingName"
            >
              {roleMappingName}
            </EuiLink>
          );
        },
      },
      {
        field: 'roles',
        name: i18n.translate('xpack.security.management.roleMappings.rolesColumnName', {
          defaultMessage: 'Roles',
        }),
        sortable: true,
        render: (entry: any, record: RoleMapping) => {
          const { roles: assignedRoleNames = [], role_templates: roleTemplates = [] } = record;
          if (roleTemplates.length > 0) {
            return (
              <span data-test-subj="roleMappingRoles">
                {i18n.translate('xpack.security.management.roleMappings.roleTemplates', {
                  defaultMessage:
                    '{templateCount, plural, one{# role template} other {# role templates}} defined',
                  values: {
                    templateCount: roleTemplates.length,
                  },
                })}
              </span>
            );
          }
          const roleLinks = assignedRoleNames.map((rolename, index) => {
            const role: Role | string =
              this.state.roles?.find((r) => r.name === rolename) ?? rolename;

            return (
              <EuiFlexItem grow={false} key={rolename}>
                <RoleTableDisplay role={role} navigateToApp={this.props.navigateToApp} />
              </EuiFlexItem>
            );
          });
          return (
            <EuiFlexGroup gutterSize="s" data-test-subj="roleMappingRoles" wrap>
              {roleLinks}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'enabled',
        name: i18n.translate('xpack.security.management.roleMappings.enabledColumnName', {
          defaultMessage: 'Enabled',
        }),
        sortable: true,
        render: (enabled: boolean) => {
          if (enabled) {
            return <EnabledBadge data-test-subj="roleMappingEnabled" />;
          }

          return <DisabledBadge data-test-subj="roleMappingEnabled" />;
        },
      },
      {
        name: i18n.translate('xpack.security.management.roleMappings.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            isPrimary: true,
            render: (record: RoleMapping) => {
              const title = i18n.translate(
                'xpack.security.management.roleMappings.actionCloneTooltip',
                { defaultMessage: 'Clone' }
              );
              const label = i18n.translate(
                'xpack.security.management.roleMappings.actionCloneAriaLabel',
                {
                  defaultMessage: `Clone '{name}'`,
                  values: { name: record.name },
                }
              );
              return (
                <EuiToolTip content={title}>
                  <EuiButtonEmpty
                    aria-label={label}
                    iconType="copy"
                    color="primary"
                    data-test-subj={`cloneRoleMappingButton-${record.name}`}
                    disabled={this.state.selectedItems.length >= 1}
                    {...reactRouterNavigate(
                      this.props.history,
                      getCloneRoleMappingHref(record.name)
                    )}
                  >
                    {title}
                  </EuiButtonEmpty>
                </EuiToolTip>
              );
            },
          },
          {
            render: (record: RoleMapping) => {
              const title = i18n.translate(
                'xpack.security.management.roleMappings.actionDeleteTooltip',
                { defaultMessage: 'Delete' }
              );
              const label = i18n.translate(
                'xpack.security.management.roleMappings.actionDeleteAriaLabel',
                {
                  defaultMessage: `Delete '{name}'`,
                  values: { name: record.name },
                }
              );
              return (
                <EuiToolTip content={title}>
                  <EuiButtonEmpty
                    aria-label={label}
                    iconType="trash"
                    color="danger"
                    data-test-subj={`deleteRoleMappingButton-${record.name}`}
                    disabled={this.state.selectedItems.length >= 1}
                    onClick={() => deleteRoleMappingPrompt([record], this.onRoleMappingsDeleted)}
                  >
                    {title}
                  </EuiButtonEmpty>
                </EuiToolTip>
              );
            },
          },
          {
            isPrimary: true,
            render: (record: RoleMapping) => {
              const label = i18n.translate(
                'xpack.security.management.roleMappings.actionEditAriaLabel',
                {
                  defaultMessage: `Edit '{name}'`,
                  values: { name: record.name },
                }
              );
              const title = i18n.translate(
                'xpack.security.management.roleMappings.actionEditTooltip',
                { defaultMessage: 'Edit' }
              );
              return (
                <EuiToolTip content={title}>
                  <EuiButtonEmpty
                    aria-label={label}
                    iconType="pencil"
                    color="primary"
                    data-test-subj={`editRoleMappingButton-${record.name}`}
                    disabled={this.state.selectedItems.length >= 1}
                    {...reactRouterNavigate(
                      this.props.history,
                      getEditRoleMappingHref(record.name)
                    )}
                  >
                    {title}
                  </EuiButtonEmpty>
                </EuiToolTip>
              );
            },
          },
        ],
      },
    ];
    return config;
  };

  private onRoleMappingsDeleted = (roleMappings: string[]): void => {
    if (roleMappings.length) {
      this.reloadRoleMappings();
    }
  };

  private onRoleMappingsDeleteCancel = () => {
    this.tableRef.current?.setSelection([]);
  };

  private async checkPrivileges() {
    try {
      const { canManageRoleMappings, hasCompatibleRealms } =
        await this.props.roleMappingsAPI.checkRoleMappingFeatures();

      this.setState({
        loadState: canManageRoleMappings ? this.state.loadState : 'permissionDenied',
        hasCompatibleRealms,
      });

      if (canManageRoleMappings) {
        this.performInitialLoad();
      }
    } catch (e) {
      this.setState({ error: e, loadState: 'finished' });
    }
  }

  private performInitialLoad = async () => {
    try {
      const [roleMappings, roles] = await Promise.all([
        this.props.roleMappingsAPI.getRoleMappings(),
        this.props.rolesAPIClient.getRoles(),
      ]);
      this.setState({ roleMappings, roles });
    } catch (e) {
      this.setState({ error: e });
    }

    this.setState({ loadState: 'finished' });
  };

  private reloadRoleMappings = () => {
    this.setState({ roleMappings: [], loadState: 'loadingTable' });
    this.loadRoleMappings();
  };

  private loadRoleMappings = async () => {
    try {
      const roleMappings = await this.props.roleMappingsAPI.getRoleMappings();
      this.setState({ roleMappings });
    } catch (e) {
      this.setState({ error: e });
    }

    this.setState({ loadState: 'finished' });
  };
}
