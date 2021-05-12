/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions } from 'kea';

import {
  EuiPageHeader,
  EuiPageContentBody,
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { DOCS_PREFIX } from '../../routes';
import { getEngineBreadcrumbs } from '../engine';

import { SearchUIForm } from './components/search_ui_form';
import { SearchUIGraphic } from './components/search_ui_graphic';
import { SEARCH_UI_TITLE } from './i18n';
import { SearchUILogic } from './search_ui_logic';

export const SearchUI: React.FC = () => {
  const { loadFieldData } = useActions(SearchUILogic);

  useEffect(() => {
    loadFieldData();
  }, []);

  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([SEARCH_UI_TITLE])} />
      <EuiPageHeader pageTitle={SEARCH_UI_TITLE} />
      <FlashMessages />
      <EuiPageContentBody>
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
                          defaultMessage="Learn more"
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
                      <EuiLink target="_blank" href={`${DOCS_PREFIX}/reference-ui-guide.html`}>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.appSearch.engine.searchUI.guideLinkText"
                          defaultMessage="Learn more"
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
      </EuiPageContentBody>
    </>
  );
};
