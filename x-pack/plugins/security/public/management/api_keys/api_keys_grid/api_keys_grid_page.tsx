/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiInMemoryTableProps } from '@elastic/eui';
import {
  EuiHealth,
  EuiButton,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiShowFor,
  EuiHideFor,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPageContent,
  EuiIcon,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import moment from 'moment-timezone';
import React, { Component } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { Route } from 'react-router-dom';
import type { History } from 'history';
import type { NotificationsStart } from 'src/core/public';

import { SectionLoading } from '../../../../../../../src/plugins/es_ui_shared/public';
import type { ApiKey, ApiKeyToInvalidate } from '../../../../common/model';
import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import { Breadcrumb } from '../../../components/breadcrumb';
import { CopyCodeField } from '../../../components/copy_code_field';
import type { APIKeysAPIClient, CreateApiKeyResponse } from '../api_keys_api_client';
import { PermissionDenied } from './permission_denied';
import { ApiKeysEmptyPrompt } from './api_keys_empty_prompt';
import { CreateApiKeyFlyout } from './create_api_key_flyout';
import { NotEnabled } from './not_enabled';
import { InvalidateProvider } from './invalidate_provider';

interface Props {
  history: History;
  notifications: NotificationsStart;
  apiKeysAPIClient: PublicMethodsOf<APIKeysAPIClient>;
}

interface State {
  isLoadingApp: boolean;
  isLoadingTable: boolean;
  isAdmin: boolean;
  canManage: boolean;
  areApiKeysEnabled: boolean;
  apiKeys: ApiKey[];
  selectedItems: ApiKey[];
  error: any;
  createdApiKey?: CreateApiKeyResponse;
}

const DATE_FORMAT = 'MMMM Do YYYY HH:mm:ss';

export class APIKeysGridPage extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      isLoadingApp: true,
      isLoadingTable: false,
      isAdmin: false,
      canManage: false,
      areApiKeysEnabled: false,
      apiKeys: [],
      selectedItems: [],
      error: undefined,
    };
  }

  public componentDidMount() {
    this.checkPrivileges();
  }

  public render() {
    return (
      <div>
        <Route path="/create">
          <Breadcrumb text="Create" href="/create">
            <CreateApiKeyFlyout
              onSuccess={(apiKey) => {
                this.props.history.push({ pathname: '/' });
                this.reloadApiKeys();
                this.setState({ createdApiKey: apiKey });
              }}
              onCancel={() => this.props.history.push({ pathname: '/' })}
            />
          </Breadcrumb>
        </Route>
        {this.renderContent()}
      </div>
    );
  }

  public renderContent() {
    const {
      isLoadingApp,
      isLoadingTable,
      areApiKeysEnabled,
      isAdmin,
      canManage,
      error,
      apiKeys,
    } = this.state;

    if (isLoadingApp) {
      return (
        <EuiPageContent>
          <SectionLoading>
            <FormattedMessage
              id="xpack.security.management.apiKeys.table.loadingApiKeysDescription"
              defaultMessage="Loading API keys…"
            />
          </SectionLoading>
        </EuiPageContent>
      );
    }

    if (!canManage) {
      return <PermissionDenied />;
    }

    if (error) {
      return (
        <EuiPageContent>
          <ApiKeysEmptyPrompt error={error}>
            <EuiButton iconType="refresh" onClick={this.loadApiKeys}>
              <FormattedMessage
                id="xpack.security.accountManagement.apiKeys.retryButton"
                defaultMessage="Try again"
              />
            </EuiButton>
          </ApiKeysEmptyPrompt>
        </EuiPageContent>
      );
    }

    if (!areApiKeysEnabled) {
      return (
        <EuiPageContent>
          <NotEnabled />
        </EuiPageContent>
      );
    }

    if (!isLoadingTable && apiKeys && apiKeys.length === 0) {
      return (
        <EuiPageContent>
          <ApiKeysEmptyPrompt>
            <EuiButton {...reactRouterNavigate(this.props.history, '/create')} fill>
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.createButton"
                defaultMessage="Create API key"
              />
            </EuiButton>
          </ApiKeysEmptyPrompt>
        </EuiPageContent>
      );
    }

    return (
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.apiKeysTitle"
                  defaultMessage="API Keys"
                />
              </h2>
            </EuiTitle>
            <EuiText color="subdued" size="s" data-test-subj="apiKeysDescriptionText">
              <p>
                {isAdmin ? (
                  <FormattedMessage
                    id="xpack.security.management.apiKeys.table.apiKeysAllDescription"
                    defaultMessage="View and invalidate API keys. An API key sends requests on behalf of a user."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.security.management.apiKeys.table.apiKeysOwnDescription"
                    defaultMessage="View and invalidate your API keys. An API key sends requests on your behalf."
                  />
                )}
              </p>
            </EuiText>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            <EuiButton {...reactRouterNavigate(this.props.history, '/create')}>
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.createButton"
                defaultMessage="Create API key"
              />
            </EuiButton>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>

        {this.state.createdApiKey && !this.state.isLoadingTable && (
          <>
            <EuiCallOut
              color="success"
              iconType="check"
              title={i18n.translate(
                'xpack.security.accountManagement.createApiKey.successMessage',
                {
                  defaultMessage: "Created API key '{name}'",
                  values: { name: this.state.createdApiKey.name },
                }
              )}
            >
              <p>
                <FormattedMessage
                  id="xpack.security.accountManagement.createApiKey.successDescription"
                  defaultMessage="Copy this key now. You will not be able to see it again."
                />
              </p>
              <CopyCodeField value={this.state.createdApiKey.api_key} />
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiPageContentBody>{this.renderTable()}</EuiPageContentBody>
      </EuiPageContent>
    );
  }

  private renderTable = () => {
    const { apiKeys, selectedItems, isLoadingTable, isAdmin } = this.state;

    const message = isLoadingTable ? (
      <FormattedMessage
        id="xpack.security.management.apiKeys.table.apiKeysTableLoadingMessage"
        defaultMessage="Loading API keys…"
      />
    ) : undefined;

    const sorting = {
      sort: {
        field: 'creation',
        direction: 'desc',
      },
    } as const;

    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50],
    };

    const selection = {
      onSelectionChange: (newSelectedItems: ApiKey[]) => {
        this.setState({
          selectedItems: newSelectedItems,
        });
      },
    };

    const search: EuiInMemoryTableProps<ApiKey>['search'] = {
      toolsLeft: selectedItems.length ? (
        <InvalidateProvider
          isAdmin={isAdmin}
          notifications={this.props.notifications}
          apiKeysAPIClient={this.props.apiKeysAPIClient}
        >
          {(invalidateApiKeyPrompt) => {
            return (
              <EuiButton
                onClick={() =>
                  invalidateApiKeyPrompt(
                    selectedItems.map(({ name, id }) => ({ name, id })),
                    this.onApiKeysInvalidated
                  )
                }
                color="danger"
                data-test-subj="bulkInvalidateActionButton"
              >
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.invalidateApiKeyButton"
                  defaultMessage="Invalidate {count, plural, one {API key} other {API keys}}"
                  values={{
                    count: selectedItems.length,
                  }}
                />
              </EuiButton>
            );
          }}
        </InvalidateProvider>
      ) : undefined,
      box: {
        incremental: true,
      },
      filters: isAdmin
        ? [
            {
              type: 'field_value_selection',
              field: 'username',
              name: i18n.translate('xpack.security.management.apiKeys.table.userFilterLabel', {
                defaultMessage: 'User',
              }),
              multiSelect: false,
              options: Object.keys(
                apiKeys.reduce((apiKeysMap: any, apiKey) => {
                  apiKeysMap[apiKey.username] = true;
                  return apiKeysMap;
                }, {})
              ).map((username) => {
                return {
                  value: username,
                  view: username,
                };
              }),
            },
            {
              type: 'field_value_selection',
              field: 'realm',
              name: i18n.translate('xpack.security.management.apiKeys.table.realmFilterLabel', {
                defaultMessage: 'Realm',
              }),
              multiSelect: false,
              options: Object.keys(
                apiKeys.reduce((apiKeysMap: any, apiKey) => {
                  apiKeysMap[apiKey.realm] = true;
                  return apiKeysMap;
                }, {})
              ).map((realm) => {
                return {
                  value: realm,
                  view: realm,
                };
              }),
            },
          ]
        : undefined,
    };

    return (
      <>
        {!isAdmin ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.manageOwnKeysWarning"
                  defaultMessage="You only have permissions to manage your own API keys."
                />
              }
              color="primary"
              iconType="user"
            />
            <EuiSpacer />
          </>
        ) : undefined}

        <EuiInMemoryTable
          items={apiKeys}
          itemId="id"
          columns={this.getColumnConfig()}
          search={search}
          sorting={sorting}
          selection={selection}
          pagination={pagination}
          loading={isLoadingTable}
          message={message}
          isSelectable={true}
        />
      </>
    );
  };

  private getColumnConfig = () => {
    const { isAdmin, isLoadingTable } = this.state;

    let config: Array<EuiBasicTableColumn<ApiKey>> = [];

    config = config.concat([
      {
        field: 'name',
        name: i18n.translate('xpack.security.management.apiKeys.table.nameColumnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
      },
    ]);

    if (isAdmin) {
      config = config.concat([
        {
          field: 'username',
          name: i18n.translate('xpack.security.management.apiKeys.table.userNameColumnName', {
            defaultMessage: 'User',
          }),
          sortable: true,
          render: (username: string) => (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="user" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>{username}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
        {
          field: 'realm',
          name: i18n.translate('xpack.security.management.apiKeys.table.realmColumnName', {
            defaultMessage: 'Realm',
          }),
          sortable: true,
          mobileOptions: {
            show: false,
          },
        },
      ]);
    }

    config = config.concat([
      {
        field: 'creation',
        name: i18n.translate('xpack.security.management.apiKeys.table.creationDateColumnName', {
          defaultMessage: 'Created',
        }),
        sortable: true,
        render: (expiration: number) => (
          <EuiToolTip content={moment(expiration).format(DATE_FORMAT)}>
            <span>{moment(expiration).fromNow()}</span>
          </EuiToolTip>
        ),
      },
      {
        name: i18n.translate('xpack.security.management.apiKeys.table.statusColumnName', {
          defaultMessage: 'Status',
        }),
        render: ({ expiration }: any) => {
          if (!expiration) {
            return (
              <EuiHealth color="primary">
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.statusActive"
                  defaultMessage="Active"
                />
              </EuiHealth>
            );
          }

          if (Date.now() > expiration) {
            return (
              <EuiHealth color="subdued">
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.statusExpired"
                  defaultMessage="Expired"
                  values={{
                    timeAgo: moment(expiration).fromNow(),
                  }}
                />
              </EuiHealth>
            );
          }

          return (
            <EuiHealth color="warning">
              <EuiToolTip content={moment(expiration).format(DATE_FORMAT)}>
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.statusExpires"
                  defaultMessage="Expires {timeFromNow}"
                  values={{
                    timeFromNow: moment(expiration).fromNow(),
                  }}
                />
              </EuiToolTip>
            </EuiHealth>
          );
        },
      },
      {
        actions: [
          {
            render: ({ name, id }: any) => {
              return (
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem>
                    <InvalidateProvider
                      isAdmin={isAdmin}
                      notifications={this.props.notifications}
                      apiKeysAPIClient={this.props.apiKeysAPIClient}
                    >
                      {(invalidateApiKeyPrompt) => {
                        return (
                          <>
                            <EuiShowFor sizes={['xs', 's', 'm', 'l']}>
                              <EuiButtonIcon
                                iconType="minusInCircle"
                                color="danger"
                                aria-label={i18n.translate(
                                  'xpack.security.management.apiKeys.table.invalidateButton',
                                  {
                                    defaultMessage: 'Invalidate',
                                  }
                                )}
                                disabled={isLoadingTable}
                                onClick={() =>
                                  invalidateApiKeyPrompt([{ id, name }], this.onApiKeysInvalidated)
                                }
                                data-test-subj="invalidateApiKeyButton"
                              />
                            </EuiShowFor>
                            <EuiHideFor sizes={['xs', 's', 'm', 'l']}>
                              <EuiButtonEmpty
                                iconType="minusInCircle"
                                color="danger"
                                flush="right"
                                disabled={isLoadingTable}
                                onClick={() =>
                                  invalidateApiKeyPrompt([{ id, name }], this.onApiKeysInvalidated)
                                }
                                data-test-subj="invalidateApiKeyButton"
                              >
                                <FormattedMessage
                                  id="xpack.security.management.apiKeys.table.invalidateButton"
                                  defaultMessage="Invalidate"
                                />
                              </EuiButtonEmpty>
                            </EuiHideFor>
                          </>
                        );
                      }}
                    </InvalidateProvider>
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            },
          },
        ],
      },
    ]);

    return config;
  };

  private onApiKeysInvalidated = (apiKeysInvalidated: ApiKeyToInvalidate[]): void => {
    if (apiKeysInvalidated.length) {
      this.reloadApiKeys();
    }
  };

  private async checkPrivileges() {
    try {
      const {
        isAdmin,
        canManage,
        areApiKeysEnabled,
      } = await this.props.apiKeysAPIClient.checkPrivileges();
      this.setState({ isAdmin, canManage, areApiKeysEnabled });

      if (!canManage || !areApiKeysEnabled) {
        this.setState({ isLoadingApp: false });
      } else {
        this.initiallyLoadApiKeys();
      }
    } catch (e) {
      this.props.notifications.toasts.addDanger(
        i18n.translate('xpack.security.management.apiKeys.table.fetchingApiKeysErrorMessage', {
          defaultMessage: 'Error checking privileges: {message}',
          values: { message: e.body?.message ?? '' },
        })
      );
    }
  }

  private initiallyLoadApiKeys = () => {
    this.setState({ isLoadingApp: true, isLoadingTable: false });
    this.loadApiKeys();
  };

  private reloadApiKeys = () => {
    this.setState({
      isLoadingApp: false,
      isLoadingTable: true,
      createdApiKey: undefined,
    });
    this.loadApiKeys();
  };

  private loadApiKeys = async () => {
    try {
      const { isAdmin } = this.state;
      const { apiKeys } = await this.props.apiKeysAPIClient.getApiKeys(isAdmin);
      this.setState({ apiKeys });
    } catch (e) {
      this.setState({ error: e });
    }

    this.setState({ isLoadingApp: false, isLoadingTable: false });
  };
}
