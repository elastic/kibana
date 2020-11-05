/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import { Route, useHistory } from 'react-router-dom';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useMount from 'react-use/lib/useMount';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { reactRouterNavigate, useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { SectionLoading } from '../../../../../../src/plugins/es_ui_shared/public';
import { ApiKey } from '../../../common/model';
import {
  APIKeysAPIClient,
  CreateApiKeyResponse,
} from '../../management/api_keys/api_keys_api_client';
import { FieldTextWithCopyButton } from '../components/field_text_with_copy_button';
import { Breadcrumb } from '../components/breadcrumb';
import { CreateApiKeyFlyout } from './create_api_key_flyout';
import { InvalidateApiKeyModal } from './invalidate_api_key_modal';
import { ApiKeysTable } from './api_keys_table';
import { ApiKeysEmptyPrompt } from './api_keys_empty_prompt';

export const ApiKeysPage: FunctionComponent = () => {
  const history = useHistory();
  const { services } = useKibana();
  const [state, getApiKeys] = useAsyncFn(() => new APIKeysAPIClient(services.http!).getApiKeys(), [
    services.http,
  ]);
  const [createdApiKey, setCreatedApiKey] = useState<CreateApiKeyResponse | undefined>();
  const [apiKeyToInvalidate, setApiKeyToInvalidate] = useState<ApiKey | undefined>();

  useMount(getApiKeys);

  if (!state.value) {
    if (state.error && !state.loading) {
      return (
        <ApiKeysEmptyPrompt error={state.error}>
          <EuiButton iconType="refresh" onClick={getApiKeys}>
            <FormattedMessage
              id="xpack.security.accountManagement.apiKeys.retryButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        </ApiKeysEmptyPrompt>
      );
    }
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.security.accountManagement.apiKeys.loadingMessage"
          defaultMessage="Loading API keys…"
        />
      </SectionLoading>
    );
  }

  return (
    <>
      <Route path="/api-keys/create">
        <Breadcrumb text="Create" {...reactRouterNavigate(history, 'api-keys/create')}>
          <CreateApiKeyFlyout
            onClose={() => history.push({ pathname: '/api-keys' })}
            onSuccess={(apiKey) => {
              history.push({ pathname: '/api-keys' });
              setCreatedApiKey(apiKey);
              getApiKeys();
            }}
          />
        </Breadcrumb>
      </Route>

      {apiKeyToInvalidate && (
        <InvalidateApiKeyModal
          apiKey={apiKeyToInvalidate}
          onCancel={() => setApiKeyToInvalidate(undefined)}
          onSuccess={() => {
            setApiKeyToInvalidate(undefined);
            setCreatedApiKey(undefined);
            getApiKeys();
          }}
        />
      )}

      {!state.loading && state.value.apiKeys.length === 0 ? (
        <ApiKeysEmptyPrompt>
          <EuiButton {...reactRouterNavigate(history, 'api-keys/create')} fill>
            <FormattedMessage
              id="xpack.security.accountManagement.apiKeys.createButton"
              defaultMessage="Create API key"
            />
          </EuiButton>
        </ApiKeysEmptyPrompt>
      ) : (
        <>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.security.accountManagement.apiKeys.description"
                defaultMessage="Allow applications to access the stack on your behalf."
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton {...reactRouterNavigate(history, 'api-keys/create')}>
                <FormattedMessage
                  id="xpack.security.accountManagement.apiKeys.createButton"
                  defaultMessage="Create API key"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          {createdApiKey && !state.loading && (
            <>
              <EuiSpacer />
              <EuiCallOut
                color="success"
                iconType="check"
                title={i18n.translate(
                  'xpack.security.accountManagement.createApiKey.successMessage',
                  {
                    defaultMessage: 'Created API key “{name}”',
                    values: { name: createdApiKey.name },
                  }
                )}
              >
                <p>
                  <FormattedMessage
                    id="xpack.security.accountManagement.createApiKey.successDescription"
                    defaultMessage="Copy your key now. You will not be able to see it again."
                  />
                </p>
                <FieldTextWithCopyButton
                  value={createdApiKey.api_key}
                  style={{ fontFamily: 'monospace', textAlign: 'center' }}
                />
              </EuiCallOut>
            </>
          )}

          <EuiSpacer />
          <ApiKeysTable
            items={state.value.apiKeys}
            loading={state.loading}
            createdItemId={createdApiKey?.id}
            onInvalidateItem={setApiKeyToInvalidate}
          />
        </>
      )}
    </>
  );
};
