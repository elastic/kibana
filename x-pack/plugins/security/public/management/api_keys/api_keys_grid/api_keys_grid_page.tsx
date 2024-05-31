/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Criteria, EuiSearchBarOnChangeArgs, Query } from '@elastic/eui';
import { EuiButton, EuiCallOut, EuiSearchBar, EuiSpacer } from '@elastic/eui';
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

import { ApiKeyFlyout } from './api_key_flyout';
import { ApiKeysEmptyPrompt } from './api_keys_empty_prompt';
import { ApiKeysTable, MAX_PAGINATED_ITEMS } from './api_keys_table';
import type { CategorizedApiKey, QueryFilters } from './api_keys_table';
import { InvalidateProvider } from './invalidate_provider';
import { Breadcrumb } from '../../../components/breadcrumb';
import { SelectableTokenField } from '../../../components/token_field';
import { useCapabilities } from '../../../components/use_capabilities';
import { useAuthentication } from '../../../components/use_current_user';
import type { CreateAPIKeyResult, QueryApiKeySortOptions } from '../api_keys_api_client';
import { APIKeysAPIClient } from '../api_keys_api_client';

interface ApiKeysTableState {
  query: Query;
  from: number;
  size: number;
  sort: QueryApiKeySortOptions;
  filters: QueryFilters;
}

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

export const APIKeysGridPage: FunctionComponent = () => {
  const { services } = useKibana<CoreStart>();
  const history = useHistory();
  const authc = useAuthentication();

  const [createdApiKey, setCreatedApiKey] = useState<CreateAPIKeyResult>();
  const [openedApiKey, setOpenedApiKey] = useState<CategorizedApiKey>();
  const readOnly = !useCapabilities('api_keys').save;

  const [tableState, setTableState] = useState<ApiKeysTableState>(DEFAULT_TABLE_STATE);

  const [state, queryApiKeysAndAggregations] = useAsyncFn((tableStateArgs: ApiKeysTableState) => {
    const queryContainer = EuiSearchBar.Query.toESQuery(tableStateArgs.query);

    const requestBody = {
      ...tableStateArgs,
      query: queryContainer,
    };

    return Promise.all([
      new APIKeysAPIClient(services.http).queryApiKeys(requestBody),
      authc.getCurrentUser(),
    ]);
  }, []);

  const resetQueryOnError = () => {
    setTableState(DEFAULT_TABLE_STATE);
    queryApiKeysAndAggregations(DEFAULT_TABLE_STATE);
  };

  const onTableChange = ({ page, sort }: Criteria<CategorizedApiKey>) => {
    const newState = {
      ...tableState,
      from: page?.index! * page?.size!,
      size: page?.size!,
      sort: sort ?? tableState.sort,
    };
    setTableState(newState);
    queryApiKeysAndAggregations(newState);
  };

  const onSearchChange = (args: EuiSearchBarOnChangeArgs) => {
    if (!args.error) {
      const newState = {
        ...tableState,
        query: args.query,
      };
      setTableState(newState);
      queryApiKeysAndAggregations(newState);
    }
  };

  const onFilterChange = (filters: QueryFilters) => {
    const newState = {
      ...tableState,
      filters: {
        ...tableState.filters,
        ...filters,
      },
    };
    setTableState(newState);
    queryApiKeysAndAggregations(newState);
  };

  useEffect(() => {
    queryApiKeysAndAggregations(DEFAULT_TABLE_STATE);
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
        <EuiButton iconType="refresh" onClick={() => queryApiKeysAndAggregations(tableState)}>
          <FormattedMessage
            id="xpack.security.accountManagement.apiKeys.retryButton"
            defaultMessage="Try again"
          />
        </EuiButton>
      </ApiKeysEmptyPrompt>
    );
  }

  const [
    {
      aggregations,
      canManageApiKeys,
      apiKeys,
      canManageOwnApiKeys,
      canManageCrossClusterApiKeys,
      aggregationTotal: totalKeys,
      total: filteredItemTotal,
      queryError,
    },
    currentUser,
  ] = state.value;

  const categorizedApiKeys = !queryError
    ? apiKeys.map((apiKey) => apiKey as CategorizedApiKey)
    : [];

  const displayedItemCount = Math.min(filteredItemTotal, totalKeys, MAX_PAGINATED_ITEMS);

  const pagination = {
    pageIndex: tableState.from / tableState.size,
    pageSize: tableState.size,
    totalItemCount: displayedItemCount,
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
              queryApiKeysAndAggregations(tableState);
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
            queryApiKeysAndAggregations(DEFAULT_TABLE_STATE);
          }}
          onCancel={() => setOpenedApiKey(undefined)}
          apiKey={openedApiKey}
          readOnly={readOnly}
        />
      )}
      {totalKeys === 0 ? (
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
            {createdApiKey && (
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
                  apiKeys={categorizedApiKeys}
                  onClick={(apiKey) => setOpenedApiKey(apiKey)}
                  query={tableState.query}
                  queryFilters={tableState.filters}
                  onDelete={(apiKeysToDelete) =>
                    invalidateApiKeyPrompt(
                      apiKeysToDelete.map(({ name, id }) => ({ name, id })),
                      () => queryApiKeysAndAggregations(tableState)
                    )
                  }
                  currentUser={currentUser}
                  createdApiKey={createdApiKey}
                  canManageCrossClusterApiKeys={canManageCrossClusterApiKeys}
                  canManageApiKeys={canManageApiKeys}
                  canManageOwnApiKeys={canManageOwnApiKeys}
                  readOnly={readOnly}
                  loading={state.loading}
                  totalItemCount={filteredItemTotal}
                  pagination={pagination}
                  onTableChange={onTableChange}
                  onSearchChange={onSearchChange}
                  onFilterChange={onFilterChange}
                  aggregations={aggregations}
                  sortingOptions={tableState.sort}
                  queryErrors={queryError}
                  resetQuery={resetQueryOnError}
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
