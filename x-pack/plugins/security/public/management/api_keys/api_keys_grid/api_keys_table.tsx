/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, Query, SearchFilterConfig } from '@elastic/eui';
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
import moment from 'moment-timezone';
import type { FunctionComponent } from 'react';
import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UserAvatar, UserProfilesPopover } from '@kbn/user-profile-components';

import type { AuthenticatedUser } from '../../../../common';
import type { ApiKey, ApiKeyAggregations, RestApiKey } from '../../../../common/model';
import type { CreateAPIKeyResult, QueryApiKeySortOptions } from '../api_keys_api_client';

export interface ApiKeysTableProps {
  apiKeys: CategorizedApiKey[];
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
  aggregations?: ApiKeyAggregations;
  sortingOptions: QueryApiKeySortOptions;
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
  sortingOptions,
}) => {
  const columns: Array<EuiBasicTableColumn<CategorizedApiKey>> = [];
  const [selectedItems, setSelectedItems] = useState<CategorizedApiKey[]>([]);
  const initialQuery = EuiSearchBar.Query.parse('');

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
          incremental: true,
          placeholder: 'Search...',
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
      <EuiSpacer />

      <EuiBasicTable
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
        sorting={{
          sort: {
            field: sortingOptions.field,
            direction: sortingOptions.direction,
          },
        }}
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

export const categorizeAggregations = (aggregationResponse?: ApiKeyAggregations) => {
  const typeFilters: Set<CategorizedApiKey['type']> = new Set();
  const usernameFilters: Set<CategorizedApiKey['username']> = new Set();
  let expiredCount = 0;

  if (aggregationResponse) {
    const { usernames, types, expired, managed } = aggregationResponse;
    types?.buckets.forEach((type) => {
      typeFilters.add(type.key);
    });
    usernames?.buckets.forEach((username) => {
      usernameFilters.add(username.key);
    });
    const { namePrefixBased, metadataBased } = managed?.buckets || {};
    if (
      (namePrefixBased?.doc_count && namePrefixBased?.doc_count > 0) ||
      (metadataBased?.doc_count && metadataBased?.doc_count > 0)
    ) {
      typeFilters.add('managed');
    }
    expiredCount = expired?.doc_count || 0;
  }

  return {
    typeFilters,
    usernameFilters,
    expired: expiredCount,
  };
};
