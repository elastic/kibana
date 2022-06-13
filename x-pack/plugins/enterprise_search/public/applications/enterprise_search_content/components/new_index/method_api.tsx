/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 */

import React from 'react';

import { EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodApi: React.FC = () => {
  return (
    <NewSearchIndexTemplate
      title={
        <FormattedMessage
          id="xpack.enterpriseSearch.content.newIndex.methodApi.title"
          defaultMessage="Index using the API"
        />
      }
      description={
        <EuiText size="s">
          <FormattedMessage
            id="xpack.enterpriseSearch.content.newIndex.methodApi.description"
            defaultMessage="Provide a name and optionally select a language analyzer for your documents. An Elasticsearch index will be created. In the next step, well display API instructions."
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
    />
  );
};
