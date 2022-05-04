/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Need get dynamic Enterprise Search API URL
 * - Port over existing API view from App Search to the panel below.
 * - move the endpoint state to a logic file
 * - Replace `onNameChange` logic with that from App Search
 * - Need to implement the logic for the attaching search engines functionality
 */

import React, { useState } from 'react';

import { EuiCodeBlock, EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { getEnterpriseSearchUrl } from '../../../shared/enterprise_search_url/external_url';

import { DOCUMENTS_API_JSON_EXAMPLE } from './constants';
import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodApi: React.FC = () => {
  const [endpoint, setEndpoint] = useState('');
  const apiKey = 1212312313; // TODO change this

  const onNameChange = (value: string) => {
    setEndpoint(value.split(' ').join('-').toLowerCase());
  };

  const searchIndexApiUrl = getEnterpriseSearchUrl('/api/ent/v1/search_indices/');

  return (
    <NewSearchIndexTemplate
      description={
        <EuiText size="s">
          <FormattedMessage
            id="xpack.enterpriseSearch.content.newIndex.methodApi.description"
            defaultMessage="Your API endpoint can be used to add new documents to your index, update documents, retrieve documents by ID, and delete documents. There are a variety of {clientLibrariesLink} to help you get started."
            values={{
              clientLibrariesLink: (
                <EuiLink href="#" target="_blank">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.methodApi.description.clientLibrariesLink',
                    {
                      defaultMessage: 'client libraries',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      }
      docsUrl="#"
      type="API endpoint"
      onNameChange={(value: string) => onNameChange(value)}
    >
      <EuiPanel hasBorder>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.enterpriseSearch.content.newIndex.methodApi.endpointTitle', {
              defaultMessage: 'Enter a name to preview your new API endpoint',
            })}
          </h3>
        </EuiTitle>
        {endpoint && (
          <>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="bash" fontSize="m" isCopyable>
              {`\
curl -X POST '${searchIndexApiUrl}${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${apiKey}' \\
  -d '${DOCUMENTS_API_JSON_EXAMPLE}'
# Returns
# [
#   {
#     "id": "park_rocky-mountain",
#     "errors": []
#   },
#   {
#     "id": "park_saguaro",
#     "errors": []
#   }
# ]`}
            </EuiCodeBlock>
          </>
        )}
      </EuiPanel>
    </NewSearchIndexTemplate>
  );
};
