/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Need to implement the logic for the attaching search engines functionality
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCodeBlock, EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { getEnterpriseSearchUrl } from '../../../shared/enterprise_search_url/external_url';

import { DOCUMENTS_API_JSON_EXAMPLE } from './constants';
import { NewSearchIndexLogic } from './new_search_index_logic';
import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodApi: React.FC = () => {
  const { name } = useValues(NewSearchIndexLogic);
  const apiKey = 1212312313; // TODO change this

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
      type="api"
    >
      <EuiPanel hasBorder>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.enterpriseSearch.content.newIndex.methodApi.endpointTitle', {
              defaultMessage: 'Enter a name to preview your new API endpoint',
            })}
          </h3>
        </EuiTitle>
        {name && (
          <>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="bash" fontSize="m" isCopyable>
              {`\
curl -X POST '${searchIndexApiUrl}${name}/document' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${apiKey}' \\
  -d '${JSON.stringify(DOCUMENTS_API_JSON_EXAMPLE, null, 2)}'
`}
            </EuiCodeBlock>
          </>
        )}
      </EuiPanel>
    </NewSearchIndexTemplate>
  );
};
