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
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { DOCS_PREFIX } from '../../routes';
import { getEngineBreadcrumbs } from '../engine';

import { SearchUIForm } from './components/search_ui_form';
import { SEARCH_UI_TITLE } from './constants';
import { SearchUILogic } from './search_ui_logic';

const DESCRIPTION = i18n.translate('xpack.enterpriseSearch.appSearch.engine.searchUI.description', {
  defaultMessage: 'Preview search or kickstart your next search experience.',
});

const SEARCH_UI_BODY_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.bodyText',
  {
    defaultMessage:
      "Search UI is an open source library for buliding search experiences, written in React. Use the fields below to generate a pre-built search experience created with Search UI. Generate an interactive preview, then download the .zip and build upon it however you'd like.",
  }
);

const REPOSITORY_LINK_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.repositoryLinkText',
  { defaultMessage: 'Read more about Search UI' }
);

const GUIDE_LINK_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.guideLinkText',
  { defaultMessage: 'Read the guide to using this generator' }
);

export const SearchUI: React.FC = () => {
  const { loadFieldData } = useActions(SearchUILogic);

  useEffect(() => {
    loadFieldData();
  }, []);

  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([SEARCH_UI_TITLE])} />
      <EuiPageHeader pageTitle={SEARCH_UI_TITLE} description={DESCRIPTION} />
      <FlashMessages />
      <EuiPageContentBody>
        <EuiFlexGroup alignItems="flexStart">
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              <p>{SEARCH_UI_BODY_TEXT}</p>
              <p>
                <EuiLink target="_blank" href="https://github.com/elastic/search-ui">
                  {REPOSITORY_LINK_TEXT}
                </EuiLink>{' '}
                |{' '}
                <EuiLink target="_blank" href={`${DOCS_PREFIX}/reference-ui-guide.html`}>
                  {GUIDE_LINK_TEXT}
                </EuiLink>{' '}
              </p>
            </EuiText>
            <EuiSpacer />
            <SearchUIForm />
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      </EuiPageContentBody>
    </>
  );
};
