/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiIcon, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';

import {
  SEARCH_APPLICATION_PATH,
  SEARCH_APPLICATION_CONTENT_PATH,
  SearchApplicationViewTabs,
  SearchApplicationContentTabs,
} from '../../routes';
import { EnterpriseSearchApplicationsPageTemplate } from '../layout/page_template';

import { AddIndicesFlyout } from './add_indices_flyout';
import { SearchApplicationError } from './search_application_error';
import { SearchApplicationIndices } from './search_application_indices';
import { SearchApplicationIndicesLogic } from './search_application_indices_logic';
import { SearchApplicationSchema } from './search_application_schema';
import { SearchApplicationViewLogic } from './search_application_view_logic';
import './search_application_layout.scss';

const pageTitle = i18n.translate(
  'xpack.enterpriseSearch.searchApplications.searchApplication.content.pageTitle',
  {
    defaultMessage: 'Content',
  }
);
const INDICES_TAB_TITLE = i18n.translate(
  'xpack.enterpriseSearch.searchApplications.searchApplication.content.indicesTabTitle',
  {
    defaultMessage: 'Indices',
  }
);
const SCHEMA_TAB_TITLE = i18n.translate(
  'xpack.enterpriseSearch.searchApplications.searchApplication.content.schemaTabTitle',
  {
    defaultMessage: 'Schema',
  }
);

const getTabBreadCrumb = (tabId: string) => {
  switch (tabId) {
    case SearchApplicationContentTabs.INDICES:
      return INDICES_TAB_TITLE;
    case SearchApplicationContentTabs.SCHEMA:
      return SCHEMA_TAB_TITLE;
    default:
      return tabId;
  }
};

const ContentTabs: string[] = Object.values(SearchApplicationContentTabs);

export const SearchApplicationContent = () => {
  const { searchApplicationName, isLoadingSearchApplication, hasSchemaConflicts } = useValues(
    SearchApplicationViewLogic
  );
  const { addIndicesFlyoutOpen } = useValues(SearchApplicationIndicesLogic);
  const { closeAddIndicesFlyout, openAddIndicesFlyout } = useActions(SearchApplicationIndicesLogic);
  const { contentTabId = SearchApplicationContentTabs.INDICES } = useParams<{
    contentTabId?: string;
  }>();

  if (!ContentTabs.includes(contentTabId)) {
    return (
      <EnterpriseSearchApplicationsPageTemplate
        pageChrome={[searchApplicationName, pageTitle]}
        pageViewTelemetry={SearchApplicationViewTabs.CONTENT}
        isLoading={isLoadingSearchApplication}
        pageHeader={{
          bottomBorder: false,
          className: 'searchApplicationHeaderBackgroundColor',
          pageTitle,
          rightSideItems: [],
        }}
        searchApplicationName={searchApplicationName}
        hasSchemaConflicts={hasSchemaConflicts}
      >
        <SearchApplicationError notFound />
      </EnterpriseSearchApplicationsPageTemplate>
    );
  }

  const onTabClick = (tab: SearchApplicationContentTabs) => () => {
    KibanaLogic.values.navigateToUrl(
      generateEncodedPath(SEARCH_APPLICATION_CONTENT_PATH, {
        contentTabId: tab,
        searchApplicationName,
      })
    );
  };

  return (
    <EnterpriseSearchApplicationsPageTemplate
      pageChrome={[searchApplicationName, pageTitle, getTabBreadCrumb(contentTabId)]}
      pageViewTelemetry={SearchApplicationViewTabs.CONTENT}
      isLoading={isLoadingSearchApplication}
      pageHeader={{
        bottomBorder: false,
        breadcrumbs: [
          {
            color: 'primary',
            onClick: () =>
              KibanaLogic.values.navigateToUrl(
                generateEncodedPath(SEARCH_APPLICATION_PATH, {
                  searchApplicationName,
                })
              ),
            text: (
              <>
                <EuiIcon size="s" type="arrowLeft" /> {searchApplicationName}
              </>
            ),
          },
        ],
        className: 'searchApplicationHeaderBackgroundColor',
        pageTitle,
        rightSideItems: [
          <EuiButton
            data-telemetry-id="entSearchApplications-indices-addNewIndices"
            data-test-subj="search-application-add-new-indices-btn"
            iconType="plusInCircle"
            fill
            onClick={openAddIndicesFlyout}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.searchApplications.searchApplication.indices.addNewIndicesButton',
              {
                defaultMessage: 'Add new indices',
              }
            )}
          </EuiButton>,
        ],
        tabs: [
          {
            isSelected: contentTabId === SearchApplicationContentTabs.INDICES,
            label: INDICES_TAB_TITLE,
            onClick: onTabClick(SearchApplicationContentTabs.INDICES),
          },
          {
            isSelected: contentTabId === SearchApplicationContentTabs.SCHEMA,
            label: (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                {hasSchemaConflicts && <EuiIcon type="warning" color="danger" />}
                {SCHEMA_TAB_TITLE}
              </EuiFlexGroup>
            ),
            onClick: onTabClick(SearchApplicationContentTabs.SCHEMA),
          },
        ],
      }}
      searchApplicationName={searchApplicationName}
      hasSchemaConflicts={hasSchemaConflicts}
    >
      {contentTabId === SearchApplicationContentTabs.INDICES && <SearchApplicationIndices />}
      {contentTabId === SearchApplicationContentTabs.SCHEMA && <SearchApplicationSchema />}
      {addIndicesFlyoutOpen && <AddIndicesFlyout onClose={closeAddIndicesFlyout} />}
    </EnterpriseSearchApplicationsPageTemplate>
  );
};
