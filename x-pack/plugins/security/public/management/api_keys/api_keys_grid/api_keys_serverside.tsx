/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Criteria,
  EuiBasicTableColumn,
  EuiSearchBarOnChangeArgs,
  Query,
  SearchFilterConfig,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { QueryContainer } from '@elastic/eui/src/components/search_bar/query/ast_to_es_query_dsl';
import moment from 'moment-timezone';
import type { FunctionComponent } from 'react';
import React, { useEffect, useState } from 'react';
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
import type { AuthenticatedUser } from '../../../../common';
import type { ApiKey, RestApiKey } from '../../../../common/model';
import type { QueryApiKeyResult } from '../../../../server/routes/api_keys';
import { Breadcrumb } from '../../../components/breadcrumb';
import { SelectableTokenField } from '../../../components/token_field';
import { useCapabilities } from '../../../components/use_capabilities';
import { useAuthentication } from '../../../components/use_current_user';
import type { CreateAPIKeyResult } from '../api_keys_api_client';
import { APIKeysAPIClient } from '../api_keys_api_client';

interface UseAsyncTableResult {
  state: QueryApiKeyResult;
  isLoading: boolean;
  query: QueryContainer;
  from: number;
  pageSize: number;
  setQuery: React.Dispatch<React.SetStateAction<QueryContainer>>;
  setFrom: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  fetchApiKeys: () => Promise<void>;
}

const useAsyncTable = (): UseAsyncTableResult => {
  const [state, setState] = useState<QueryApiKeyResult>({} as QueryApiKeyResult);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<QueryContainer>({});
  const [from, setFrom] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const { services } = useKibana<CoreStart>();

  const fetchApiKeys = async () => {
    setIsLoading(true);

    const requestBody = {
      query: Object.keys(query).length === 0 ? undefined : query,
      from,
      size: pageSize,
    };

    try {
      const response = await new APIKeysAPIClient(services.http).queryApiKeys(requestBody);

      setState(response);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [query, from, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state,
    isLoading,
    query,
    from,
    setQuery,
    setFrom,
    fetchApiKeys,
    pageSize,
    setPageSize,
  };
};

export const APIKeysGridPageServer: FunctionComponent = () => {
  const { services } = useKibana<CoreStart>();
  const history = useHistory();
  const authc = useAuthentication();

  const [state, queryApiKeysFn] = useAsyncFn(
    () =>
      Promise.all([
        new APIKeysAPIClient(services.http).queryApiKeys(),
        new APIKeysAPIClient(services.http).queryApiKeyAggregations(),
        authc.getCurrentUser(),
      ]),
    [services.http]
  );

  const [createdApiKey, setCreatedApiKey] = useState<CreateAPIKeyResult>();
  const [openedApiKey, setOpenedApiKey] = useState<CategorizedApiKey>();
  const readOnly = !useCapabilities('api_keys').save;

  const {
    state: requestState,
    isLoading,
    from,
    setQuery,
    setFrom,
    fetchApiKeys,
    pageSize,
    setPageSize,
  } = useAsyncTable();

  useEffect(() => {
    fetchApiKeys();
    queryApiKeysFn();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onTableChange = ({ page }: Criteria<ApiKey>) => {
    setFrom(page?.index! * pageSize);
    setPageSize(page?.size!);
  };

  const onSearchChange = (args: EuiSearchBarOnChangeArgs) => {
    if (!args.error) {
      // try {
      //   console.log(EuiSearchBar.Query.parse(args.queryText));
      // } catch (e) {
      //   console.log(e);
      //   throw e;
      // }
      const queryContainer = EuiSearchBar.Query.toESQuery(args.query);
      setQuery(queryContainer);
    }
  };

  if (!state.value) {
    if (isLoading) {
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
        <EuiButton iconType="refresh" onClick={() => fetchApiKeys()}>
          <FormattedMessage
            id="xpack.security.accountManagement.apiKeys.retryButton"
            defaultMessage="Try again"
          />
        </EuiButton>
      </ApiKeysEmptyPrompt>
    );
  }

  const [_, { aggregations }, currentUser] = state.value && state.value;

  const pagination = {
    pageIndex: from / pageSize,
    pageSize,
    totalItemCount: requestState.total,
    pageSizeOptions: [25, 50, 100],
  };
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
              queryApiKeysFn();
            }}
            onCancel={() => history.push({ pathname: '/' })}
            canManageCrossClusterApiKeys={requestState.canManageCrossClusterApiKeys}
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
            queryApiKeysFn();
          }}
          onCancel={() => setOpenedApiKey(undefined)}
          apiKey={openedApiKey}
          readOnly={readOnly}
        />
      )}
      {!requestState.apiKeys.length ? (
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
                defaultMessage="Allow external services to access the Elastic Stack on behalf of a user."
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

            {requestState.canManageOwnApiKeys && !requestState.canManageApiKeys ? (
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
              isAdmin={requestState.canManageApiKeys}
              notifications={services.notifications}
              apiKeysAPIClient={new APIKeysAPIClient(services.http)}
            >
              {(invalidateApiKeyPrompt) => (
                <ApiKeysTable
                  apiKeys={requestState.apiKeys}
                  onClick={(apiKey) => setOpenedApiKey(apiKey)}
                  onDelete={(apiKeysToDelete) =>
                    invalidateApiKeyPrompt(
                      apiKeysToDelete.map(({ name, id }) => ({ name, id })),
                      fetchApiKeys
                    )
                  }
                  currentUser={currentUser}
                  createdApiKey={createdApiKey}
                  canManageCrossClusterApiKeys={requestState.canManageCrossClusterApiKeys}
                  canManageApiKeys={requestState.canManageApiKeys}
                  canManageOwnApiKeys={requestState.canManageOwnApiKeys}
                  readOnly={readOnly}
                  loading={state.loading}
                  totalItemCount={requestState.total}
                  pagination={pagination}
                  onTableChange={onTableChange}
                  onSearchChange={onSearchChange}
                  aggregations={aggregations}
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
  totalItemCount?: number;
  onTableChange: any;
  pagination: any;
  onSearchChange: any;
  aggregations: ApiKeyAggregations;
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
  totalItemCount = 0,
  onTableChange,
  pagination,
  onSearchChange,
  aggregations,
}) => {
  const columns: Array<EuiBasicTableColumn<CategorizedApiKey>> = [];
  const [selectedItems, setSelectedItems] = useState<CategorizedApiKey[]>([]);
  const initialQuery = EuiSearchBar.Query.MATCH_ALL;

  const { typeFilters, usernameFilters, expired } = categorizeAggregations(aggregations);

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
      name: (
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.typeColumnName"
          defaultMessage="Type"
        />
      ),
      sortable: true,
      render: (type: CategorizedApiKey['type']) => <ApiKeyBadge type={type} />,
    }
  );

  if (canManageApiKeys || usernameFilters.size > 1) {
    columns.push({
      field: 'username',
      name: (
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.ownerColumnName"
          defaultMessage="Owner"
        />
      ),
      sortable: true,
      render: (username: CategorizedApiKey['username']) => <UsernameWithIcon username={username} />,
    });
  }

  columns.push(
    {
      field: 'creation',
      name: (
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.createdColumnName"
          defaultMessage="Created"
        />
      ),
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
      name: (
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.statusColumnName"
          defaultMessage="Status"
        />
      ),
      sortable: true,
      render: (expiration: number) => <ApiKeyStatus expiration={expiration} />,
    }
  );

  if (!readOnly) {
    columns.push({
      width: `${24 + 2 * 8}px`,
      actions: [
        {
          name: (
            <FormattedMessage
              id="xpack.security.management.apiKeys.table.deleteAction"
              defaultMessage="Delete"
            />
          ),
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

  if (typeFilters.size > 1) {
    filters.push({
      type: 'custom_component',
      component: ({ query, onChange }) => (
        <TypesFilterButton types={[...typeFilters]} query={query} onChange={onChange} />
      ),
    });
  }

  if (expired > 0) {
    filters.push({
      type: 'field_value_toggle_group',
      field: 'expiration',
      items: [
        {
          value: 'now+1m/m',
          name: i18n.translate('xpack.security.management.apiKeys.table.activeFilter', {
            defaultMessage: 'Active',
          }),
          operator: 'gt',
        },
        {
          value: 'now',
          name: i18n.translate('xpack.security.management.apiKeys.table.expiredFilter', {
            defaultMessage: 'Expired',
          }),
          operator: 'lte',
        },
      ],
    });
  }

  if (usernameFilters.size > 1) {
    filters.push({
      type: 'custom_component',
      component: ({ query, onChange }) => (
        <UsersFilterButton usernames={[...usernameFilters]} query={query} onChange={onChange} />
      ),
    });
  }

  return (
    <>
      <EuiSearchBar
        defaultQuery={initialQuery}
        box={{
          placeholder: 'Search...',
          incremental: true,
        }}
        filters={filters}
        onChange={onSearchChange}
        toolsLeft={
          selectedItems.length ? (
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
          ) : undefined
        }
      />
      <EuiSpacer />

      <EuiBasicTable
        // @ts-ignore
        items={apiKeys}
        itemId="id"
        columns={columns}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
        selection={
          readOnly
            ? undefined
            : {
                selectable: deletable,
                onSelectionChange: setSelectedItems,
              }
        }
        isSelectable={canManageOwnApiKeys}
      />
    </>
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
            defaultMessage="Personal"
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
            defaultMessage="Cross-Cluster"
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
  type: 'rest' | 'cross_cluster' | 'managed';
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
          defaultMessage="Cross-Cluster"
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
          defaultMessage="Personal"
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

interface AggregationResponse<V> {
  buckets: Array<{ key: V; doc_count: number }>;
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
}
export interface ApiKeyAggregations {
  usernames: AggregationResponse<string>;
  types: AggregationResponse<'rest' | 'cross_cluster' | 'managed'>;
  expired: { doc_count: number };
}

export const categorizeAggregations = (aggregationResponse: ApiKeyAggregations) => {
  const { usernames, types, expired } = aggregationResponse;
  const typeFilters: Set<CategorizedApiKey['type']> = new Set();
  const usernameFilters: Set<CategorizedApiKey['username']> = new Set();

  types.buckets.forEach((type) => {
    typeFilters.add(type.key);
  });
  usernames.buckets.forEach((username) => {
    usernameFilters.add(username.key);
  });
  return {
    typeFilters,
    usernameFilters,
    expired: expired.doc_count,
  };
};
