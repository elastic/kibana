/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiText, EuiFlexItem, EuiFlexGroup, EuiSpacer, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { SEARCH_UI_DOCS_URL } from '../../routes';
import { EngineLogic, getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { EmptyState } from './components/empty_state';
import { SearchUIForm } from './components/search_ui_form';
import { SearchUIGraphic } from './components/search_ui_graphic';
import { SEARCH_UI_TITLE } from './i18n';
import { SearchUILogic } from './search_ui_logic';

export const SearchUI: React.FC = () => {
  const { loadFieldData } = useActions(SearchUILogic);
  const { hasEmptySchema } = useValues(EngineLogic);

  useEffect(() => {
    loadFieldData();
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([SEARCH_UI_TITLE])}
      pageHeader={{ pageTitle: SEARCH_UI_TITLE }}
      isEmptyState={hasEmptySchema}
      emptyState={<EmptyState />}
    >
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.engine.searchUI.bodyDescription"
                defaultMessage="Search UI is a free and open library for building search experiences with React. {link}."
                values={{
                  link: (
                    <EuiLink target="_blank" href="https://github.com/elastic/search-ui">
                      <FormattedMessage
                        id="xpack.enterpriseSearch.appSearch.engine.searchUI.repositoryLinkText"
                        defaultMessage="View the Github repo"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.engine.searchUI.lowerBodyDescription"
                defaultMessage="Use the fields below to generate a sample search experience built with Search UI. Use the sample to preview search results, or build upon it to create your own custom search experience. {link}."
                values={{
                  link: (
                    <EuiLink target="_blank" href={SEARCH_UI_DOCS_URL}>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.appSearch.engine.searchUI.guideLinkText"
                        defaultMessage="Learn more about Search UI"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
          <EuiSpacer />
          <SearchUIForm />
        </EuiFlexItem>
        <EuiFlexItem>
          <SearchUIGraphic />
        </EuiFlexItem>
      </EuiFlexGroup>
    </AppSearchPageTemplate>
  );
};
