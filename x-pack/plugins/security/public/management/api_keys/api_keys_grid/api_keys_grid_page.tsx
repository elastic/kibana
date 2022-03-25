/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiInMemoryTableProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { History } from 'history';
import moment from 'moment-timezone';
import React, { Component } from 'react';
import { Route } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { NotificationsStart } from 'src/core/public';

import { APP_WRAPPER_CLASS } from '../../../../../../../src/core/public';
import { SectionLoading } from '../../../../../../../src/plugins/es_ui_shared/public';
import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import type { ApiKey, ApiKeyToInvalidate } from '../../../../common/model';
import { Breadcrumb } from '../../../components/breadcrumb';
import { SelectableTokenField } from '../../../components/token_field';
import type { APIKeysAPIClient, CreateApiKeyResponse } from '../api_keys_api_client';
import { ApiKeysEmptyPrompt } from './api_keys_empty_prompt';
import { CreateApiKeyFlyout } from './create_api_key_flyout';
import type { InvalidateApiKeys } from './invalidate_provider';
import { InvalidateProvider } from './invalidate_provider';
import { NotEnabled } from './not_enabled';
import { PermissionDenied } from './permission_denied';

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
  apiKeys?: ApiKey[];
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
      apiKeys: undefined,
      selectedItems: [],
      error: undefined,
    };
  }

  public componentDidMount() {
    this.checkPrivileges();
  }

  public render() {
    return (
      <div className={APP_WRAPPER_CLASS}>
        <Route path="/create">
          <Breadcrumb
            text={i18n.translate('xpack.security.management.apiKeys.createBreadcrumb', {
              defaultMessage: 'Create',
            })}
            href="/create"
          >
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
    const { isLoadingApp, isLoadingTable, areApiKeysEnabled, isAdmin, canManage, error, apiKeys } =
      this.state;

    if (!apiKeys) {
      if (isLoadingApp) {
        return (
          <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
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
          <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
            <ApiKeysEmptyPrompt error={error}>
              <EuiButton iconType="refresh" onClick={this.reloadApiKeys}>
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
          <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
            <NotEnabled />
          </EuiPageContent>
        );
      }
    }

    if (!isLoadingTable && apiKeys && apiKeys.length === 0) {
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
          <ApiKeysEmptyPrompt>
            <EuiButton
              {...reactRouterNavigate(this.props.history, '/create')}
              fill
              iconType="plusInCircleFilled"
              data-test-subj="apiKeysCreatePromptButton"
            >
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.createButton"
                defaultMessage="Create API key"
              />
            </EuiButton>
          </ApiKeysEmptyPrompt>
        </EuiPageContent>
      );
    }

    const concatenated = `${this.state.createdApiKey?.id}:${this.state.createdApiKey?.api_key}`;

    return (
      <>
        <EuiPageHeader
          bottomBorder
          pageTitle={
            <FormattedMessage
              id="xpack.security.management.apiKeys.table.apiKeysTitle"
              defaultMessage="API Keys"
            />
          }
          description={
            <>
              {isAdmin ? (
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.apiKeysAllDescription"
                  defaultMessage="View and delete API keys. An API key sends requests on behalf of a user."
                />
              ) : (
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.apiKeysOwnDescription"
                  defaultMessage="View and delete your API keys. An API key sends requests on your behalf."
                />
              )}
            </>
          }
          rightSideItems={[
            <EuiButton
              {...reactRouterNavigate(this.props.history, '/create')}
              fill
              iconType="plusInCircleFilled"
              data-test-subj="apiKeysCreateTableButton"
            >
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.createButton"
                defaultMessage="Create API key"
              />
            </EuiButton>,
          ]}
        />

        <EuiSpacer size="l" />

        {this.state.createdApiKey && !this.state.isLoadingTable && (
          <>
            <EuiCallOut
              color="success"
              iconType="check"
              title={i18n.translate('xpack.security.management.apiKeys.createSuccessMessage', {
                defaultMessage: "Created API key '{name}'",
                values: { name: this.state.createdApiKey.name },
              })}
            >
              <p>
                <FormattedMessage
                  id="xpack.security.management.apiKeys.successDescription"
                  defaultMessage="Copy this key now. You will not be able to view it again."
                />
              </p>
              <SelectableTokenField
                options={[
                  {
                    key: 'base64',
                    value: btoa(concatenated),
                    icon: 'empty',
                    label: i18n.translate('xpack.security.management.apiKeys.base64Label', {
                      defaultMessage: 'Base64',
                    }),
                    description: i18n.translate(
                      'xpack.security.management.apiKeys.base64Description',
                      {
                        defaultMessage: 'Format used to authenticate with Elasticsearch.',
                      }
                    ),
                  },
                  {
                    key: 'json',
                    value: JSON.stringify(this.state.createdApiKey),
                    icon: 'empty',
                    label: i18n.translate('xpack.security.management.apiKeys.jsonLabel', {
                      defaultMessage: 'JSON',
                    }),
                    description: i18n.translate(
                      'xpack.security.management.apiKeys.jsonDescription',
                      {
                        defaultMessage: 'Full API response.',
                      }
                    ),
                  },
                  {
                    key: 'beats',
                    value: concatenated,
                    icon: 'logoBeats',
                    label: i18n.translate('xpack.security.management.apiKeys.beatsLabel', {
                      defaultMessage: 'Beats',
                    }),
                    description: i18n.translate(
                      'xpack.security.management.apiKeys.beatsDescription',
                      {
                        defaultMessage: 'Format used to configure Beats.',
                      }
                    ),
                  },
                  {
                    key: 'logstash',
                    value: concatenated,
                    icon: 'logoLogstash',
                    label: i18n.translate('xpack.security.management.apiKeys.logstashLabel', {
                      defaultMessage: 'Logstash',
                    }),
                    description: i18n.translate(
                      'xpack.security.management.apiKeys.logstashDescription',
                      {
                        defaultMessage: 'Format used to configure Logstash.',
                      }
                    ),
                  },
                ]}
              />
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiPageContentBody>{this.renderTable()}</EuiPageContentBody>
      </>
    );
  }

  private renderTable = () => {
    const { apiKeys, selectedItems, isLoadingTable, isAdmin, error } = this.state;

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
                  defaultMessage="Delete {count, plural, one {API key} other {API keys}}"
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
                apiKeys?.reduce((apiKeysMap: any, apiKey) => {
                  apiKeysMap[apiKey.username] = true;
                  return apiKeysMap;
                }, {}) ?? {}
              ).map((username) => {
                return {
                  value: username,
                  view: (
                    <EuiToolTip delay="long" position="left" content={username}>
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="user" />
                        </EuiFlexItem>
                        <EuiFlexItem
                          css={css`
                            overflow: hidden;
                          `}
                          grow={false}
                        >
                          <EuiText className="eui-textTruncate">{username}</EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiToolTip>
                  ),
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
                apiKeys?.reduce((apiKeysMap: any, apiKey) => {
                  apiKeysMap[apiKey.realm] = true;
                  return apiKeysMap;
                }, {}) ?? {}
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
                  defaultMessage="You only have permission to manage your own API keys."
                />
              }
              color="primary"
              iconType="user"
            />
            <EuiSpacer />
          </>
        ) : undefined}

        <InvalidateProvider
          isAdmin={isAdmin}
          notifications={this.props.notifications}
          apiKeysAPIClient={this.props.apiKeysAPIClient}
        >
          {(invalidateApiKeyPrompt) => (
            <EuiInMemoryTable
              items={apiKeys ?? []}
              itemId="id"
              columns={this.getColumnConfig(invalidateApiKeyPrompt)}
              search={search}
              sorting={sorting}
              selection={selection}
              pagination={pagination}
              loading={isLoadingTable}
              error={
                error &&
                i18n.translate('xpack.security.management.apiKeysEmptyPrompt.errorMessage', {
                  defaultMessage: 'Could not load API keys.',
                })
              }
              message={message}
              isSelectable={true}
            />
          )}
        </InvalidateProvider>
      </>
    );
  };

  private getColumnConfig = (invalidateApiKeyPrompt: InvalidateApiKeys) => {
    const { isAdmin, createdApiKey } = this.state;

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
              <EuiFlexItem grow={false}>
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
        mobileOptions: {
          show: false,
        },
        render: (creation: string, item: ApiKey) => (
          <EuiToolTip content={moment(creation).format(DATE_FORMAT)}>
            {item.id === createdApiKey?.id ? (
              <EuiBadge color="success">
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.createdBadge"
                  defaultMessage="Just now"
                />
              </EuiBadge>
            ) : (
              <span>{moment(creation).fromNow()}</span>
            )}
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
            name: i18n.translate('xpack.security.management.apiKeys.table.deleteAction', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate(
              'xpack.security.management.apiKeys.table.deleteDescription',
              {
                defaultMessage: 'Delete this API key',
              }
            ),
            icon: 'trash',
            type: 'icon',
            color: 'danger',
            onClick: (item) =>
              invalidateApiKeyPrompt([{ id: item.id, name: item.name }], this.onApiKeysInvalidated),
            'data-test-subj': 'apiKeysTableDeleteAction',
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
      const { isAdmin, canManage, areApiKeysEnabled } =
        await this.props.apiKeysAPIClient.checkPrivileges();
      this.setState({ isAdmin, canManage, areApiKeysEnabled });

      if (!canManage || !areApiKeysEnabled) {
        this.setState({ isLoadingApp: false });
      } else {
        this.loadApiKeys();
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

  private reloadApiKeys = () => {
    this.setState({
      isLoadingApp: false,
      isLoadingTable: true,
      createdApiKey: undefined,
      error: undefined,
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
