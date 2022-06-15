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

import { useActions, useValues } from 'kea';

import { EuiLink, EuiText, EuiCheckbox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { NewSearchIndexLogic } from './new_search_index_logic';
import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodApi: React.FC = () => {
  const { shouldCreateAlias } = useValues(NewSearchIndexLogic);
  const { toggleCreateAlias } = useActions(NewSearchIndexLogic);

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
    >
      <EuiCheckbox
        id="alias-checkbox"
        label={
          <FormattedMessage
            id="xpack.enterpriseSearch.content.newIndex.methodApi.aliasCheckbox"
            defaultMessage={
              'Create a search experience: create an {aliasDocLink} "search-<INDEX NAME>" and {appSearchEngineDocLink} connected to this index.'
            }
            values={{
              aliasDocLink: (
                <EuiLink href="#" target="_blank">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.methodApi.aliasCheckbox.aliasDocLink',
                    {
                      defaultMessage: 'alias',
                    }
                  )}
                </EuiLink>
              ),
              appSearchEngineDocLink: (
                <EuiLink href="#" target="_blank">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.methodApi.aliasCheckbox.appSearchEngineDocLink',
                    {
                      defaultMessage: 'App Search Engine',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        }
        onChange={toggleCreateAlias}
        checked={shouldCreateAlias}
      />
    </NewSearchIndexTemplate>
  );
};
