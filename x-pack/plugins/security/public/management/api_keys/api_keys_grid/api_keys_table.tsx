/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
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
import type { CustomComponentProps } from '@elastic/eui/src/components/search_bar/filters/custom_component_filter';
import moment from 'moment-timezone';
import type { FunctionComponent } from 'react';
import React, { createContext, useContext, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UserAvatar, UserProfilesPopover } from '@kbn/user-profile-components';

import { ApiKeysEmptyPrompt, doesErrorIndicateBadQuery } from './api_keys_empty_prompt';
import type { AuthenticatedUser } from '../../../../common';
import type { ApiKey, ApiKeyAggregations, BaseApiKey } from '../../../../common/model';
import type { CreateAPIKeyResult, QueryApiKeySortOptions } from '../api_keys_api_client';

export interface TablePagination {
  pageIndex: number;
  pageSize?: number;
  totalItemCount: number;
  pageSizeOptions?: number[];
  showPerPageOptions?: boolean;
}

export interface ApiKeysTableProps {
  apiKeys: CategorizedApiKey[];
  queryFilters: QueryFilters;
  currentUser: AuthenticatedUser;
  createdApiKey?: CreateAPIKeyResult;
  query: Query;
  readOnly?: boolean;
  loading?: boolean;
  canManageCrossClusterApiKeys: boolean;
  canManageApiKeys: boolean;
  canManageOwnApiKeys: boolean;
  onClick(apiKey: CategorizedApiKey): void;
  onDelete(apiKeys: CategorizedApiKey[]): void;
  totalItemCount?: number;
  onTableChange: ({ page, sort }: Criteria<CategorizedApiKey>) => void;
  pagination: TablePagination;
  onSearchChange: (args: EuiSearchBarOnChangeArgs) => boolean | void;
  aggregations?: ApiKeyAggregations;
  sortingOptions: QueryApiKeySortOptions;
  queryErrors?: Error;
  resetQuery: () => void;
  onFilterChange: (filters: QueryFilters) => void;
}

export interface QueryFilters {
  usernames?: string[];
  type?: 'rest' | 'managed' | 'cross_cluster';
  expired?: boolean;
}

export const MAX_PAGINATED_ITEMS = 10000;
const FiltersContext = createContext<{
  types: string[];
  usernames: string[];
  filters: QueryFilters;
  onFilterChange: (filters: QueryFilters) => void;
}>({ types: [], usernames: [], filters: {}, onFilterChange: () => {} });

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
  sortingOptions,
  queryErrors,
  resetQuery,
  query,
  queryFilters,
  onFilterChange,
}) => {
  const columns: Array<EuiBasicTableColumn<CategorizedApiKey>> = [];
  const [selectedItems, setSelectedItems] = useState<CategorizedApiKey[]>([]);

  const { typeFilters, usernameFilters, expired } = categorizeAggregations(aggregations);

  const deletable = (item: CategorizedApiKey) =>
    canManageApiKeys || (canManageOwnApiKeys && item.username === currentUser.username);

  const isBadRequest = queryErrors && doesErrorIndicateBadQuery(queryErrors);

  const itemsToDisplay = isBadRequest ? [] : apiKeys;

  columns.push(
    {
      field: 'name',
      name: (
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.nameColumnName"
          defaultMessage="Name"
        />
      ),
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
      render: (type: CategorizedApiKey['type'], apiKeyRecord) => {
        let keyType = type;
        if (
          apiKeyRecord.name.indexOf('Alerting: ') === 0 ||
          apiKeyRecord.metadata?.managed === true
        ) {
          keyType = 'managed';
        }
        return <ApiKeyBadge type={keyType} />;
      },
    }
  );

  if (canManageApiKeys || usernameFilters.length > 1) {
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

  if (typeFilters.length > 1) {
    filters.push({
      type: 'custom_component',
      component: TypesFilterButton,
    });
  }

  if (expired > 0) {
    filters.push({
      type: 'custom_component',
      component: ExpiredFilterButton,
    });
  }

  if (usernameFilters.length > 1) {
    filters.push({
      type: 'custom_component',
      component: UsersFilterButton,
    });
  }

  const exceededResultCount = totalItemCount > MAX_PAGINATED_ITEMS;

  return (
    <>
      <FiltersContext.Provider
        value={{
          types: [...typeFilters],
          usernames: [...usernameFilters],
          filters: queryFilters,
          onFilterChange,
        }}
      >
        <EuiSearchBar
          query={query}
          box={{
            incremental: true,
            schema: {
              strict: true,
              fields: {
                name: {
                  type: 'string',
                },
                type: {
                  type: 'string',
                },
                username: {
                  type: 'string',
                },
                owner: {
                  type: 'string',
                },
                expired: {
                  type: 'boolean',
                },
              },
            },
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
      </FiltersContext.Provider>
      <EuiSpacer size="s" />
      {isBadRequest ? (
        <ApiKeysEmptyPrompt error={queryErrors}>
          <EuiButton
            iconType="refresh"
            onClick={() => {
              resetQuery();
            }}
          >
            <FormattedMessage
              id="xpack.security.accountManagement.apiKeys.resetQueryButton"
              defaultMessage="Reset query"
            />
          </EuiButton>
        </ApiKeysEmptyPrompt>
      ) : (
        <>
          {exceededResultCount && (
            <>
              <EuiText color="subdued" size="s" data-test-subj="apiKeysTableTooManyResultsLabel">
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.tooManyResultsLabel"
                  defaultMessage="Showing {limit} of {totalItemCount, plural, one {# api key} other {# api keys}}"
                  values={{ totalItemCount, limit: MAX_PAGINATED_ITEMS }}
                />
              </EuiText>
              <EuiSpacer size="s" />
            </>
          )}
          <EuiBasicTable
            items={itemsToDisplay}
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
            sorting={{
              sort: {
                field: sortingOptions.field,
                direction: sortingOptions.direction,
              },
            }}
          />
        </>
      )}
    </>
  );
};

export const TypesFilterButton: FunctionComponent<CustomComponentProps> = ({ query, onChange }) => {
  const { types, filters, onFilterChange } = useContext(FiltersContext);

  if (!onChange) {
    return null;
  }

  return (
    <>
      {types.includes('rest') ? (
        <EuiFilterButton
          iconType="user"
          iconSide="left"
          hasActiveFilters={filters.type === 'rest'}
          onClick={() => {
            onFilterChange({ ...filters, type: filters.type === 'rest' ? undefined : 'rest' });
          }}
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
          hasActiveFilters={filters.type === 'cross_cluster'}
          onClick={() => {
            onFilterChange({
              ...filters,
              type: filters.type === 'cross_cluster' ? undefined : 'cross_cluster',
            });
          }}
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
          hasActiveFilters={filters.type === 'managed'}
          onClick={() => {
            onFilterChange({
              ...filters,
              type: filters.type === 'managed' ? undefined : 'managed',
            });
          }}
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

export const ExpiredFilterButton: FunctionComponent<CustomComponentProps> = ({
  query,
  onChange,
}) => {
  const { filters, onFilterChange } = useContext(FiltersContext);

  if (!onChange) {
    return null;
  }

  return (
    <>
      <EuiFilterButton
        hasActiveFilters={filters.expired === false}
        onClick={() => {
          if (filters.expired === false) {
            onFilterChange({ ...filters, expired: undefined });
          } else {
            onFilterChange({ ...filters, expired: false });
          }
        }}
        withNext={true}
      >
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.activeFilter"
          defaultMessage="Active"
        />
      </EuiFilterButton>
      <EuiFilterButton
        hasActiveFilters={filters.expired === true}
        onClick={() => {
          if (filters.expired === true) {
            onFilterChange({ ...filters, expired: undefined });
          } else {
            onFilterChange({ ...filters, expired: true });
          }
        }}
      >
        <FormattedMessage
          id="xpack.security.management.apiKeys.table.expiredFilter"
          defaultMessage="Expired"
        />
      </EuiFilterButton>
    </>
  );
};

export const UsersFilterButton: FunctionComponent<CustomComponentProps> = ({ query, onChange }) => {
  const { usernames, filters, onFilterChange } = useContext(FiltersContext);

  const filteredUsernames = filters.usernames || [];

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!onChange) {
    return null;
  }

  let numActiveFilters = 0;
  const clause = filters.usernames || [];
  if (clause.length) {
    numActiveFilters = clause.length;
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
          .filter((username) => filteredUsernames.includes(username))
          .map((username) => ({
            uid: username,
            user: { username },
            enabled: false,
            data: {},
          })),
        onChange: (nextSelectedOptions) => {
          const nextFilters = nextSelectedOptions.map((option) => option.user.username);
          onFilterChange({ ...filters, usernames: nextFilters });
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
export interface ManagedApiKey extends BaseApiKey {
  type: 'managed';
}

/**
 * Interface representing an API key the way it is presented in the Kibana UI  (with Kibana system
 * API keys given its own dedicated `managed` type).
 */
export type CategorizedApiKey = (ApiKey | ManagedApiKey) & {
  expired: boolean;
};

export const categorizeAggregations = (aggregationResponse?: ApiKeyAggregations) => {
  const typeFilters: Array<CategorizedApiKey['type']> = [];
  const usernameFilters: Array<CategorizedApiKey['username']> = [];
  let expiredCount = 0;

  if (aggregationResponse && Object.keys(aggregationResponse).length > 0) {
    const { usernames, types, expired, managed } = aggregationResponse;
    const typeBuckets = types?.buckets.length
      ? (types.buckets as estypes.AggregationsStringTermsBucket[])
      : [];

    const usernameBuckets = usernames?.buckets.length
      ? (usernames.buckets as estypes.AggregationsStringTermsBucket[])
      : [];

    typeBuckets.forEach((type) => {
      typeFilters.push(type.key);
    });
    usernameBuckets.forEach((username) => {
      usernameFilters.push(username.key);
    });
    const { namePrefixBased, metadataBased } = managed?.buckets || {};
    if (
      (namePrefixBased?.doc_count && namePrefixBased.doc_count > 0) ||
      (metadataBased?.doc_count && metadataBased.doc_count > 0)
    ) {
      typeFilters.push('managed');
    }
    expiredCount = expired?.doc_count ?? 0;
  }

  return {
    typeFilters,
    usernameFilters,
    expired: expiredCount,
  };
};
