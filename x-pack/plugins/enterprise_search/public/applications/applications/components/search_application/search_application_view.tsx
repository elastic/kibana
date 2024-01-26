/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams, Redirect } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { Status } from '../../../../../common/types/api';
import {
  SEARCH_APPLICATION_PATH,
  SEARCH_APPLICATION_CONTENT_PATH,
  SEARCH_APPLICATION_CONNECT_PATH,
  SearchApplicationViewTabs,
  SearchApplicationConnectTabs,
  SearchApplicationContentTabs,
} from '../../routes';

import { EnterpriseSearchApplicationsPageTemplate } from '../layout/page_template';
import { DeleteSearchApplicationModal } from '../search_applications/delete_search_application_modal';

import { SearchApplicationConnect } from './connect/search_application_connect';
import { SearchApplicationDocsExplorer } from './docs_explorer/docs_explorer';
import { SearchApplicationContent } from './search_application_content';
import { SearchApplicationError } from './search_application_error';
import { SearchApplicationViewLogic } from './search_application_view_logic';

export const SearchApplicationView: React.FC = () => {
  const { fetchSearchApplication, closeDeleteSearchApplicationModal } = useActions(
    SearchApplicationViewLogic
  );
  const {
    searchApplicationName,
    fetchSearchApplicationApiError,
    fetchSearchApplicationApiStatus,
    hasSchemaConflicts,
    isDeleteModalVisible,
  } = useValues(SearchApplicationViewLogic);
  const { tabId = SearchApplicationViewTabs.DOCS_EXPLORER } = useParams<{
    tabId?: string;
  }>();

  useEffect(() => {
    fetchSearchApplication({ name: searchApplicationName });
  }, [searchApplicationName]);

  if (fetchSearchApplicationApiStatus === Status.ERROR) {
    return (
      <EnterpriseSearchApplicationsPageTemplate
        isEmptyState
        pageChrome={[searchApplicationName]}
        pageViewTelemetry={tabId}
        pageHeader={{
          bottomBorder: false,
          pageTitle: searchApplicationName,
          rightSideItems: [],
        }}
        searchApplicationName={searchApplicationName}
        emptyState={<SearchApplicationError error={fetchSearchApplicationApiError} />}
        hasSchemaConflicts={hasSchemaConflicts}
      />
    );
  }

  return (
    <>
      {isDeleteModalVisible ? (
        <DeleteSearchApplicationModal
          searchApplicationName={searchApplicationName}
          onClose={closeDeleteSearchApplicationModal}
        />
      ) : null}
      <Routes>
        <Route
          exact
          path={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.DOCS_EXPLORER}`}
          component={SearchApplicationDocsExplorer}
        />
        <Route path={SEARCH_APPLICATION_CONTENT_PATH} component={SearchApplicationContent} />
        <Redirect
          from={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONTENT}`}
          to={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONTENT}/${SearchApplicationContentTabs.INDICES}`}
        />
        <Route path={SEARCH_APPLICATION_CONNECT_PATH} component={SearchApplicationConnect} />
        <Redirect
          from={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONNECT}`}
          to={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONNECT}/${SearchApplicationConnectTabs.SEARCHAPI}`}
        />
        <Route>
          <EnterpriseSearchApplicationsPageTemplate
            isEmptyState
            pageChrome={[searchApplicationName]}
            pageViewTelemetry={tabId}
            pageHeader={{
              bottomBorder: false,
              pageTitle: searchApplicationName,
              rightSideItems: [],
            }}
            searchApplicationName={searchApplicationName}
            hasSchemaConflicts={hasSchemaConflicts}
          >
            <SearchApplicationError notFound />
          </EnterpriseSearchApplicationsPageTemplate>
        </Route>
      </Routes>
    </>
  );
};
