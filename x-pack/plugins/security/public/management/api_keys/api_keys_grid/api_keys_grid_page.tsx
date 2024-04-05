/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Criteria, EuiSearchBarOnChangeArgs, Query } from '@elastic/eui';
import { EuiButton, EuiCallOut, EuiSearchBar, EuiSpacer } from '@elastic/eui';
import type { QueryContainer } from '@elastic/eui/src/components/search_bar/query/ast_to_es_query_dsl';
import { debounce } from 'lodash';
import moment from 'moment';
import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
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
import type { CategorizedApiKey } from './api_keys_table';
import { InvalidateProvider } from './invalidate_provider';
import type { ApiKey } from '../../../../common/model';
import { Breadcrumb } from '../../../components/breadcrumb';
import { SelectableTokenField } from '../../../components/token_field';
import { useCapabilities } from '../../../components/use_capabilities';
import { useAuthentication } from '../../../components/use_current_user';
import type { CreateAPIKeyResult, QueryApiKeySortOptions } from '../api_keys_api_client';
import { APIKeysAPIClient } from '../api_keys_api_client';

const parseSearchBarQuery = (query: Query): QueryContainer => {
  let parsedQuery = query;

  if (parsedQuery.hasSimpleFieldClause('owner')) {
    const ownerQueryValue = parsedQuery.getSimpleFieldClause('owner')!.value;
    parsedQuery = parsedQuery
      .removeSimpleFieldClauses('owner')
      .addSimpleFieldValue('username', `${ownerQueryValue}`);
  }

  if (query.text.includes('type:managed')) {
    const subQuery = query.text.replace('type:managed', '');
    parsedQuery = EuiSearchBar.Query.parse(`${subQuery} (metadata.managed:true OR Alerting*)`);
  } else if (query.text.includes('type:rest') || query.text.includes('type:cross_cluster')) {
    parsedQuery = EuiSearchBar.Query.parse(`${query.text} -metadata.managed:true -Alerting*`);
  }

  if (query.text.includes('expired:true')) {
    const subQuery = query.text.replace('expired:true', '');
    parsedQuery = EuiSearchBar.Query.parse(`${subQuery} expiration<=${moment.now()}`);
  } else if (query.text.includes('expired:false')) {
    const subQuery = query.text.replace('expired:false', '');
    parsedQuery = EuiSearchBar.Query.parse(`${subQuery} expiration>${moment.now()}`);
  }

  parsedQuery = parsedQuery.addSimpleFieldValue('invalidated', false);

  return EuiSearchBar.Query.toESQuery(parsedQuery);
};

export const APIKeysGridPage: FunctionComponent = () => {
  const { services } = useKibana<CoreStart>();
  const history = useHistory();
  const authc = useAuthentication();

  const [query, setQuery] = useState<Query>(EuiSearchBar.Query.parse(''));
  const [from, setFrom] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [tableSort, setTableSort] = useState<QueryApiKeySortOptions>({
    field: 'creation',
    direction: 'desc',
  });
  const [createdApiKey, setCreatedApiKey] = useState<CreateAPIKeyResult>();
  const [openedApiKey, setOpenedApiKey] = useState<CategorizedApiKey>();
  const readOnly = !useCapabilities('api_keys').save;

  const [state, queryApiKeysAndAggregations] = useAsyncFn(() => {
    const queryContainer = parseSearchBarQuery(query);

    const requestBody = {
      query: queryContainer,
      from,
      size: pageSize,
      sort: tableSort,
    };

    return Promise.all([
      new APIKeysAPIClient(services.http).queryApiKeys(requestBody),
      authc.getCurrentUser(),
    ]);
  }, [services.http, query, from, pageSize, tableSort]);

  const resetQueryOnError = () => {
    setQuery(EuiSearchBar.Query.parse(''));
    setFrom(0);
    setTableSort({ field: 'creation', direction: 'desc' });
  };

  const onTableChange = ({ page, sort }: Criteria<ApiKey>) => {
    setFrom(page?.index! * pageSize);
    setPageSize(page?.size!);
    if (sort) {
      setTableSort(sort);
    }
  };

  const onSearchChange = (args: EuiSearchBarOnChangeArgs) => {
    if (!args.error) {
      setQuery(args.query);
    }
  };

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnSearchChange = useCallback(debounce(onSearchChange, 500), []);

  useEffect(() => {
    queryApiKeysAndAggregations();
  }, [query, from, pageSize, tableSort]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <EuiButton iconType="refresh" onClick={() => resetQueryOnError()}>
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
    },
    currentUser,
  ] = state.value && state.value;

  const categorizedApiKeys = apiKeys.map((apiKey) => apiKey as CategorizedApiKey);

  const pagination = {
    pageIndex: from / pageSize,
    pageSize,
    totalItemCount: totalKeys < MAX_PAGINATED_ITEMS ? totalKeys : MAX_PAGINATED_ITEMS,
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
              queryApiKeysAndAggregations();
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
            queryApiKeysAndAggregations();
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
                  onDelete={(apiKeysToDelete) =>
                    invalidateApiKeyPrompt(
                      apiKeysToDelete.map(({ name, id }) => ({ name, id })),
                      queryApiKeysAndAggregations
                    )
                  }
                  currentUser={currentUser}
                  createdApiKey={createdApiKey}
                  canManageCrossClusterApiKeys={canManageCrossClusterApiKeys}
                  canManageApiKeys={canManageApiKeys}
                  canManageOwnApiKeys={canManageOwnApiKeys}
                  readOnly={readOnly}
                  loading={state.loading}
                  totalItemCount={totalKeys}
                  pagination={pagination}
                  onTableChange={onTableChange}
                  onSearchChange={debouncedOnSearchChange}
                  aggregations={aggregations}
                  sortingOptions={tableSort}
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
