/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { LanguageDefinitionSnippetArguments } from '@kbn/search-api-panels';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '@kbn/search-api-panels/constants';

import { Status } from '../../../../../common/types/api';

import { CreateApiKeyAPILogic } from '../../../enterprise_search_overview/api/create_elasticsearch_api_key_logic';
import { FetchApiKeysAPILogic } from '../../../enterprise_search_overview/api/fetch_api_keys_logic';
import { CreateApiKeyFlyout } from '../../../shared/api_key/create_api_key_flyout';
import { useCloudDetails } from '../../../shared/cloud_details/cloud_details';
import { GettingStarted } from '../../../shared/getting_started/getting_started';
import { KibanaLogic } from '../../../shared/kibana/kibana_logic';
import { EnterpriseSearchElasticsearchPageTemplate } from '../layout';

export const ElasticsearchGuide = () => {
  const { user } = useValues(KibanaLogic);
  const cloudContext = useCloudDetails();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const codeArgs: LanguageDefinitionSnippetArguments = {
    apiKey: '',
    cloudId: cloudContext.cloudId,
    url: cloudContext.elasticsearchUrl || ELASTICSEARCH_URL_PLACEHOLDER,
  };
  const { makeRequest } = useActions(FetchApiKeysAPILogic);
  const { makeRequest: saveApiKey } = useActions(CreateApiKeyAPILogic);
  const { error, status } = useValues(CreateApiKeyAPILogic);
  const { data } = useValues(FetchApiKeysAPILogic);
  const apiKeys = data?.api_keys || [];

  useEffect(() => makeRequest({}), []);

  return (
    <EnterpriseSearchElasticsearchPageTemplate>
      {isFlyoutOpen && (
        <CreateApiKeyFlyout
          error={error?.body?.message}
          isLoading={status === Status.LOADING}
          onClose={() => setIsFlyoutOpen(false)}
          setApiKey={saveApiKey}
          username={user?.full_name || user?.username || ''}
        />
      )}
      <EuiTitle size="l">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.content.overview.gettingStarted.pageTitle', {
            defaultMessage: 'Getting Started with Elastic API',
          })}
        </h2>
      </EuiTitle>
      <GettingStarted
        apiKeys={apiKeys}
        openApiKeyModal={() => setIsFlyoutOpen(true)}
        codeArgs={codeArgs}
        isPanelLeft
        showPipelinesPanel
      />
    </EnterpriseSearchElasticsearchPageTemplate>
  );
};
