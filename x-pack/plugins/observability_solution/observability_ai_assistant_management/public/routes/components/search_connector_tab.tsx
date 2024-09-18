/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';

export const SELECTED_CONNECTOR_LOCAL_STORAGE_KEY =
  'xpack.observabilityAiAssistant.lastUsedConnector';

export function SearchConnectorTab() {
  const { application } = useKibana().services;
  const url = application.getUrlForApp('enterprise_search', { path: '/content/connectors' });

  return (
    <>
      <EuiText>
        {i18n.translate(
          'xpack.observabilityAiAssistantManagement.searchConnectorTab.searchConnectorsEnablesYouTextLabel',
          {
            defaultMessage:
              'Connectors enable you to index content from external sources thereby making it available for the AI Assistant. This can greatly improve the relevance of the AI Assistant’s responses.',
          }
        )}
      </EuiText>

      <EuiText>
        <FormattedMessage
          id="xpack.observabilityAiAssistantManagement.searchConnectorTab.searchConnectorsManagementLink"
          defaultMessage="You can manage connectors under {searchConnectorLink}."
          values={{
            searchConnectorLink: (
              <EuiLink
                data-test-subj="pluginsSearchConnectorTabSearchConnectorsManagementPageLink"
                href={url}
              >
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.searchConnectorTab.searchConnectorsManagementPageLinkLabel',
                  { defaultMessage: 'Connectors' }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
}
