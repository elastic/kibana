/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, Query, SearchFilterConfig } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import moment from 'moment-timezone';
import type { FunctionComponent } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import type { CoreStart } from '@kbn/core/public';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Route } from '@kbn/shared-ux-router';
import { UserAvatar, UserProfilesPopover } from '@kbn/user-profile-components';

import { ApiKeyFlyout } from './api_key_flyout';
import { ApiKeysEmptyPrompt } from './api_keys_empty_prompt';
import { InvalidateProvider } from './invalidate_provider';
import type { ApiKey, AuthenticatedUser, RestApiKey } from '../../../../common';
import { Breadcrumb } from '../../../components/breadcrumb';
import { SelectableTokenField } from '../../../components/token_field';
import { useCapabilities } from '../../../components/use_capabilities';
import { useAuthentication } from '../../../components/use_current_user';
import type { CreateAPIKeyResult } from '../api_keys_api_client';
import { APIKeysAPIClient } from '../api_keys_api_client';

export const APIKeysGridPage: FunctionComponent = () => {
  const { services } = useKibana<CoreStart>();
  const history = useHistory();
  const authc = useAuthentication();
  const [state, getApiKeys] = useAsyncFn(
    () => Promise.all([new APIKeysAPIClient(services.http).getApiKeys(), authc.getCurrentUser()]),
    [services.http]
  );

  const [createdApiKey, setCreatedApiKey] = useState<CreateAPIKeyResult>();
  const [openedApiKey, setOpenedApiKey] = useState<CategorizedApiKey>();
  const readOnly = !useCapabilities('api_keys').save;

  useEffect(() => {
    getApiKeys();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state.value) {
    if (state.loading) {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.loadingApiKeysDescription"
            defaultMessage="Loading API keys…"
          />
        </SectionLoading>
      );
    }

    return (
      <ApiKeysEmptyPrompt error={state.error}>
        <EuiButton iconType="refresh" onClick={() => getApiKeys()}>
          <FormattedMessage
            id="xpack.security.accountManagement.apiKeys.retryButton"
            defaultMessage="Try again"
          />
        </EuiButton>
      </ApiKeysEmptyPrompt>
    );
  }

  const [
    { apiKeys, canManageCrossClusterApiKeys, canManageApiKeys, canManageOwnApiKeys },
    currentUser,
  ] = state.value;

  return (
    <>
      <Route path="/create">
        <Breadcrumb
          text={i18n.translate('xpack.security.management.apiKeys.createBreadcrumb', {
            defaultMessage: 'Create',
          })}
          href="/create"
        >
          <ApiKeyFlyout
            onSuccess={(createApiKeyResponse) => {
              history.push({ pathname: '/' });
              setCreatedApiKey(createApiKeyResponse);
              getApiKeys();
            }}
            onCancel={() => history.push({ pathname: '/' })}
            canManageCrossClusterApiKeys={canManageCrossClusterApiKeys}
          />
        </Breadcrumb>
      </Route>

      {openedApiKey && (
        <ApiKeyFlyout
          onSuccess={() => {
            services.notifications.toasts.addSuccess({
              title: i18n.translate('xpack.security.management.apiKeys.updateSuccessMessage', {
                defaultMessage: "Updated API key '{name}'",
                values: { name: openedApiKey.name },
              }),
              'data-test-subj': 'updateApiKeySuccessToast',
            });

            setOpenedApiKey(undefined);
            getApiKeys();
          }}
          onCancel={() => setOpenedApiKey(undefined)}
          apiKey={openedApiKey}
          readOnly={readOnly}
        />
      )}

      {!apiKeys.length ? (
        <ApiKeysEmptyPrompt readOnly={readOnly}>
          <EuiButton
            {...reactRouterNavigate(history, '/create')}
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
      ) : (
        <>
          <KibanaPageTemplate.Header
            pageTitle={
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.apiKeysTitle"
                defaultMessage="API keys"
              />
            }
            description={
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.apiKeysAllDescription"
                defaultMessage="Allow external services to access your Elastic Stack."
              />
            }
            rightSideItems={
              !readOnly
                ? [
                    <EuiButton
                      {...reactRouterNavigate(history, '/create')}
                      fill
                      iconType="plusInCircleFilled"
                      data-test-subj="apiKeysCreateTableButton"
                    >
                      <FormattedMessage
                        id="xpack.security.management.apiKeys.table.createButton"
                        defaultMessage="Create API key"
                      />
                    </EuiButton>,
                  ]
                : undefined
            }
            paddingSize="none"
            bottomBorder
          />
          <EuiSpacer />
          <KibanaPageTemplate.Section paddingSize="none">
            {createdApiKey && !state.loading && (
              <>
                <ApiKeyCreatedCallout createdApiKey={createdApiKey} />
                <EuiSpacer />
              </>
            )}

            {canManageOwnApiKeys && !canManageApiKeys ? (
              <>
                <EuiCallOut
                  title={
                    <FormattedMessage
                      id="xpack.security.management.apiKeys.table.manageOwnKeysWarning"
                      defaultMessage="You only have permission to manage your own API keys."
                    />
                  }
                />
                <EuiSpacer />
              </>
            ) : undefined}

            <InvalidateProvider
              isAdmin={canManageApiKeys}
              notifications={services.notifications}
              apiKeysAPIClient={new APIKeysAPIClient(services.http)}
            >
              {(invalidateApiKeyPrompt) => (
                <ApiKeysTable
                  apiKeys={apiKeys}
                  onClick={(apiKey) => setOpenedApiKey(apiKey)}
                  onDelete={(apiKeysToDelete) =>
                    invalidateApiKeyPrompt(
                      apiKeysToDelete.map(({ name, id }) => ({ name, id })),
                      getApiKeys
                    )
                  }
                  currentUser={currentUser}
                  createdApiKey={createdApiKey}
                  canManageCrossClusterApiKeys={canManageCrossClusterApiKeys}
                  canManageApiKeys={canManageApiKeys}
                  canManageOwnApiKeys={canManageOwnApiKeys}
                  readOnly={readOnly}
                  loading={state.loading}
                />
              )}
            </InvalidateProvider>
          </KibanaPageTemplate.Section>
        </>
      )}
    </>
  );
};

export interface ApiKeyCreatedCalloutProps {
  createdApiKey: CreateAPIKeyResult;
}

export const ApiKeyCreatedCallout: FunctionComponent<ApiKeyCreatedCalloutProps> = ({
  createdApiKey,
}) => {
  const concatenated = `${createdApiKey.id}:${createdApiKey.api_key}`;
  return (
    <EuiCallOut
      color="success"
      iconType="check"
      title={i18n.translate('xpack.security.management.apiKeys.createSuccessMessage', {
        defaultMessage: "Created API key '{name}'",
        values: { name: createdApiKey.name },
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
            key: 'encoded',
            value: createdApiKey.encoded,
            icon: 'empty',
            label: i18n.translate('xpack.security.management.apiKeys.encodedLabel', {
              defaultMessage: 'Encoded',
            }),
            description: i18n.translate('xpack.security.management.apiKeys.encodedDescription', {
              defaultMessage: 'Format used to make requests to Elasticsearch REST API.',
            }),
          },
          {
            key: 'beats',
            value: concatenated,
            icon: 'logoBeats',
            label: i18n.translate('xpack.security.management.apiKeys.beatsLabel', {
              defaultMessage: 'Beats',
            }),
            description: i18n.translate('xpack.security.management.apiKeys.beatsDescription', {
              defaultMessage: 'Format used to configure Beats.',
            }),
          },
          {
            key: 'logstash',
            value: concatenated,
            icon: 'logoLogstash',
            label: i18n.translate('xpack.security.management.apiKeys.logstashLabel', {
              defaultMessage: 'Logstash',
            }),
            description: i18n.translate('xpack.security.management.apiKeys.logstashDescription', {
              defaultMessage: 'Format used to configure Logstash.',
            }),
          },
        ]}
      />
    </EuiCallOut>
  );
};

export interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  currentUser: AuthenticatedUser;
  createdApiKey?: CreateAPIKeyResult;
  readOnly?: boolean;
  loading?: boolean;
  canManageCrossClusterApiKeys: boolean;
  canManageApiKeys: boolean;
  canManageOwnApiKeys: boolean;
  onClick(apiKey: CategorizedApiKey): void;
  onDelete(apiKeys: CategorizedApiKey[]): void;
}

export const ApiKeysTable: FunctionComponent<ApiKeysTableProps> = ({
  apiKeys,
  createdApiKey,
  currentUser,
  onClick,
  onDelete,
  canManageApiKeys = false,
  canManageOwnApiKeys = false,
  readOnly = false,
  loading = false,
}) => {
  const columns: Array<EuiBasicTableColumn<CategorizedApiKey>> = [];
  const [selectedItems, setSelectedItems] = useState<CategorizedApiKey[]>([]);

  const { categorizedApiKeys, typeFilters, usernameFilters, expiredFilters } = useMemo(
    () => categorizeApiKeys(apiKeys),
    [apiKeys]
  );

  const deletable = (item: CategorizedApiKey) =>
    canManageApiKeys || (canManageOwnApiKeys && item.username === currentUser.username);

  columns.push(
    {
      field: 'name',
      name: i18n.translate('xpack.security.management.apiKeys.table.nameColumnName', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (name: string, item: CategorizedApiKey) => {
        return (
          <EuiLink onClick={() => onClick(item)} data-test-subj={`apiKeyRowName-${item.name}`}>
            {name}
          </EuiLink>
        );
      },
    },
    {
      field: 'type',
      name: i18n.translate('xpack.security.management.apiKeys.table.typeColumnName', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      render: (type: CategorizedApiKey['type']) => <ApiKeyBadge type={type} />,
    }
  );

  if (canManageApiKeys || usernameFilters.length > 1) {
    columns.push({
      field: 'username',
      name: i18n.translate('xpack.security.management.apiKeys.table.ownerColumnName', {
        defaultMessage: 'Owner',
      }),
      sortable: true,
      render: (username: CategorizedApiKey['username']) => <UsernameWithIcon username={username} />,
    });
  }

  columns.push(
    {
      field: 'creation',
      name: i18n.translate('xpack.security.management.apiKeys.table.createdColumnName', {
        defaultMessage: 'Created',
      }),
      sortable: true,
      mobileOptions: {
        show: false,
      },
      render: (creation: number, item: CategorizedApiKey) => (
        <TimeToolTip timestamp={creation}>
          {item.id === createdApiKey?.id ? (
            <EuiBadge color="success">
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.createdBadge"
                defaultMessage="Just now"
              />
            </EuiBadge>
          ) : null}
        </TimeToolTip>
      ),
    },
    {
      field: 'expiration',
      name: i18n.translate('xpack.security.management.apiKeys.table.statusColumnName', {
        defaultMessage: 'Status',
      }),
      sortable: true,
      render: (expiration: number) => <ApiKeyStatus expiration={expiration} />,
    }
  );

  if (!readOnly) {
    columns.push({
      width: `${24 + 2 * 8}px`,
      actions: [
        {
          name: i18n.translate('xpack.security.management.apiKeys.table.deleteAction', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate('xpack.security.management.apiKeys.table.deleteDescription', {
            defaultMessage: 'Delete this API key',
          }),
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          onClick: (item) => onDelete([item]),
          available: deletable,
          'data-test-subj': 'apiKeysTableDeleteAction',
        },
      ],
    });
  }

  const filters: SearchFilterConfig[] = [];

  if (typeFilters.length > 1) {
    filters.push({
      type: 'custom_component',
      component: ({ query, onChange }) => (
        <TypesFilterButton types={typeFilters} query={query} onChange={onChange} />
      ),
    });
  }

  if (usernameFilters.length > 1) {
    filters.push({
      type: 'custom_component',
      component: ({ query, onChange }) => (
        <UsersFilterButton usernames={usernameFilters} query={query} onChange={onChange} />
      ),
    });
  }

  if (expiredFilters.length > 1) {
    filters.push({
      type: 'field_value_toggle_group',
      field: 'expired',
      items: [
        {
          value: false,
          name: i18n.translate('xpack.security.management.apiKeys.table.activeFilter', {
            defaultMessage: 'Active',
          }),
        },
        {
          value: true,
          name: i18n.translate('xpack.security.management.apiKeys.table.expiredFilter', {
            defaultMessage: 'Expired',
          }),
        },
      ],
    });
  }

  return (
    <EuiInMemoryTable
      items={categorizedApiKeys}
      itemId="id"
      columns={columns}
      search={
        categorizedApiKeys.length > 0
          ? {
              toolsLeft: selectedItems.length ? (
                <EuiButton
                  onClick={() => onDelete(selectedItems)}
                  color="danger"
                  iconType="trash"
                  data-test-subj="bulkInvalidateActionButton"
                >
                  <FormattedMessage
                    id="xpack.security.management.apiKeys.table.invalidateApiKeyButton"
                    defaultMessage="Delete {count, plural, one {API key} other {# API keys}}"
                    values={{
                      count: selectedItems.length,
                    }}
                  />
                </EuiButton>
              ) : undefined,
              box: {
                incremental: true,
              },
              filters,
            }
          : undefined
      }
      sorting={{
        sort: {
          field: 'creation',
          direction: 'desc',
        },
      }}
      selection={
        readOnly
          ? undefined
          : {
              selectable: deletable,
              onSelectionChange: setSelectedItems,
            }
      }
      pagination={{
        initialPageSize: 10,
        pageSizeOptions: [10, 25, 50],
      }}
      loading={loading}
    />
  );
};

export interface TypesFilterButtonProps {
  query: Query;
  onChange?: (query: Query) => void;
  types: string[];
}

export const TypesFilterButton: FunctionComponent<TypesFilterButtonProps> = ({
  query,
  onChange,
  types,
}) => {
  if (!onChange) {
    return null;
  }

  return (
    <>
      {types.includes('rest') ? (
        <EuiFilterButton
          iconType="user"
          iconSide="left"
          hasActiveFilters={query.hasSimpleFieldClause('type', 'rest')}
          onClick={() =>
            onChange(
              query.hasSimpleFieldClause('type', 'rest')
                ? query.removeSimpleFieldClauses('type')
                : query.removeSimpleFieldClauses('type').addSimpleFieldValue('type', 'rest')
            )
          }
          withNext={types.includes('cross_cluster') || types.includes('managed')}
        >
          <FormattedMessage
            id="xpack.security.accountManagement.apiKeyBadge.restTitle"
            defaultMessage="User"
          />
        </EuiFilterButton>
      ) : null}
      {types.includes('cross_cluster') ? (
        <EuiFilterButton
          iconType="cluster"
          iconSide="left"
          hasActiveFilters={query.hasSimpleFieldClause('type', 'cross_cluster')}
          onClick={() =>
            onChange(
              query.hasSimpleFieldClause('type', 'cross_cluster')
                ? query.removeSimpleFieldClauses('type')
                : query
                    .removeSimpleFieldClauses('type')
                    .addSimpleFieldValue('type', 'cross_cluster')
            )
          }
          withNext={types.includes('managed')}
        >
          <FormattedMessage
            id="xpack.security.accountManagement.apiKeyBadge.crossClusterLabel"
            defaultMessage="Cross-cluster"
          />
        </EuiFilterButton>
      ) : null}
      {types.includes('managed') ? (
        <EuiFilterButton
          iconType="gear"
          iconSide="left"
          hasActiveFilters={query.hasSimpleFieldClause('type', 'managed')}
          onClick={() =>
            onChange(
              query.hasSimpleFieldClause('type', 'managed')
                ? query.removeSimpleFieldClauses('type')
                : query.removeSimpleFieldClauses('type').addSimpleFieldValue('type', 'managed')
            )
          }
        >
          <FormattedMessage
            id="xpack.security.accountManagement.apiKeyBadge.managedTitle"
            defaultMessage="Managed"
          />
        </EuiFilterButton>
      ) : null}
    </>
  );
};

export interface UsersFilterButtonProps {
  query: Query;
  onChange?: (query: Query) => void;
  usernames: string[];
}

export const UsersFilterButton: FunctionComponent<UsersFilterButtonProps> = ({
  query,
  onChange,
  usernames,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!onChange) {
    return null;
  }

  let numActiveFilters = 0;
  const clause = query.getOrFieldClause('username');
  if (clause) {
    if (Array.isArray(clause.value)) {
      numActiveFilters = clause.value.length;
    } else {
      numActiveFilters = 1;
    }
  }

  const usernamesMatchingSearchTerm = searchTerm
    ? usernames.filter((username) => username.includes(searchTerm))
    : usernames;

  return (
    <UserProfilesPopover
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsOpen((toggle) => !toggle)}
          isSelected={isOpen}
          numFilters={usernames.length}
          hasActiveFilters={numActiveFilters ? true : false}
          numActiveFilters={numActiveFilters}
        >
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.ownerFilter"
            defaultMessage="Owner"
          />
        </EuiFilterButton>
      }
      isOpen={isOpen}
      panelPaddingSize="none"
      anchorPosition="downCenter"
      panelClassName="euiFilterGroup__popoverPanel"
      closePopover={() => setIsOpen(false)}
      selectableProps={{
        options: usernamesMatchingSearchTerm.map((username) => ({
          uid: username,
          user: { username },
          enabled: false,
          data: {},
        })),
        onSearchChange: setSearchTerm,
        selectedOptions: usernames
          .filter((username) => query.hasOrFieldClause('username', username))
          .map((username) => ({
            uid: username,
            user: { username },
            enabled: false,
            data: {},
          })),
        onChange: (nextSelectedOptions) => {
          const nextQuery = nextSelectedOptions.reduce(
            (acc, option) => acc.addOrFieldValue('username', option.user.username),
            query.removeOrFieldClauses('username')
          );
          onChange(nextQuery);
        },
      }}
    />
  );
};

export type UsernameWithIconProps = Pick<CategorizedApiKey, 'username'>;

export const UsernameWithIcon: FunctionComponent<UsernameWithIconProps> = ({ username }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <UserAvatar user={{ username }} size="s" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" data-test-subj="apiKeyUsername">
        {username}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface TimeToolTipProps {
  timestamp: number;
}

export const TimeToolTip: FunctionComponent<TimeToolTipProps> = ({ timestamp, children }) => {
  return (
    <EuiToolTip content={moment(timestamp).format('LLL')}>
      <span>{children ?? moment(timestamp).fromNow()}</span>
    </EuiToolTip>
  );
};

export type ApiKeyStatusProps = Pick<CategorizedApiKey, 'expiration'>;

export const ApiKeyStatus: FunctionComponent<ApiKeyStatusProps> = ({ expiration }) => {
  if (!expiration) {
    return (
      <EuiHealth color="primary" data-test-subj="apiKeyStatus">
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.statusActive"
          defaultMessage="Active"
        />
      </EuiHealth>
    );
  }

  if (Date.now() > expiration) {
    return (
      <EuiHealth color="subdued" data-test-subj="apiKeyStatus">
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.statusExpired"
          defaultMessage="Expired"
        />
      </EuiHealth>
    );
  }

  return (
    <EuiHealth color="warning" data-test-subj="apiKeyStatus">
      <TimeToolTip timestamp={expiration}>
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.statusExpires"
          defaultMessage="Expires {timeFromNow}"
          values={{
            timeFromNow: moment(expiration).fromNow(),
          }}
        />
      </TimeToolTip>
    </EuiHealth>
  );
};

export interface ApiKeyBadgeProps {
  type: CategorizedApiKeyType;
}

export const ApiKeyBadge: FunctionComponent<ApiKeyBadgeProps> = ({ type }) => {
  return type === 'cross_cluster' ? (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.crossClusterDescription"
          defaultMessage="Allows remote clusters to connect to your local cluster."
        />
      }
    >
      <EuiBadge color="hollow" iconType="cluster">
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.crossClusterLabel"
          defaultMessage="Cross-cluster"
        />
      </EuiBadge>
    </EuiToolTip>
  ) : type === 'managed' ? (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.managedDescription"
          defaultMessage="Created and managed by Kibana to correctly run background tasks."
        />
      }
    >
      <EuiBadge color="hollow" iconType="gear">
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.managedTitle"
          defaultMessage="Managed"
        />
      </EuiBadge>
    </EuiToolTip>
  ) : (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.restDescription"
          defaultMessage="Allows external services to access the Elastic Stack on behalf of a user."
        />
      }
    >
      <EuiBadge color="hollow" iconType="user">
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeyBadge.restTitle"
          defaultMessage="User"
        />
      </EuiBadge>
    </EuiToolTip>
  );
};

/**
 * Interface representing a REST API key that is managed by Kibana.
 */
export interface ManagedApiKey extends Omit<RestApiKey, 'type'> {
  type: 'managed';
}

/**
 * Interface representing an API key the way it is presented in the Kibana UI  (with Kibana system
 * API keys given its own dedicated `managed` type).
 */
export type CategorizedApiKey = (ApiKey | ManagedApiKey) & {
  expired: boolean;
};

/**
 * Categorizes API keys by type (with Kibana system API keys given its own dedicated `managed` type)
 * and determines applicable filter values.
 */
export function categorizeApiKeys(apiKeys: ApiKey[]) {
  const categorizedApiKeys: CategorizedApiKey[] = [];
  const typeFilters: Set<CategorizedApiKey['type']> = new Set();
  const usernameFilters: Set<CategorizedApiKey['username']> = new Set();
  const expiredFilters: Set<CategorizedApiKey['expired']> = new Set();

  apiKeys.forEach((apiKey) => {
    const type = getApiKeyType(apiKey);
    const expired = apiKey.expiration ? Date.now() > apiKey.expiration : false;

    typeFilters.add(type);
    usernameFilters.add(apiKey.username);
    expiredFilters.add(expired);

    categorizedApiKeys.push({ ...apiKey, type, expired } as CategorizedApiKey);
  });

  return {
    categorizedApiKeys,
    typeFilters: [...typeFilters],
    usernameFilters: [...usernameFilters],
    expiredFilters: [...expiredFilters],
  };
}

export type CategorizedApiKeyType = ReturnType<typeof getApiKeyType>;

/**
 * Determines API key type the way it is presented in the UI with Kibana system API keys given its own dedicated `managed` type.
 */
export function getApiKeyType(apiKey: ApiKey) {
  return apiKey.type === 'rest' &&
    (apiKey.metadata?.managed || apiKey.name.indexOf('Alerting: ') === 0)
    ? 'managed'
    : apiKey.type;
}
