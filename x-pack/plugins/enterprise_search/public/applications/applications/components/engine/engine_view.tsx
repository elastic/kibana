/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useLayoutEffect } from 'react';
import { useParams, Redirect, Switch } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { Route } from '@kbn/shared-ux-router';

import { Status } from '../../../../../common/types/api';

import { KibanaLogic } from '../../../shared/kibana';
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

import { EngineConnect } from './engine_connect/engine_connect';
import { EngineError } from './engine_error';
import { EngineViewLogic } from './engine_view_logic';
import { EngineHeaderDocsAction } from './header_docs_action';
import { SearchApplicationContent } from './search_application_content';
import { EngineSearchPreview } from './search_preview/engine_search_preview';

export const EngineView: React.FC = () => {
  const { fetchEngine, closeDeleteEngineModal } = useActions(EngineViewLogic);
  const {
    engineName,
    fetchEngineApiError,
    fetchEngineApiStatus,
    hasSchemaConflicts,
    isDeleteModalVisible,
  } = useValues(EngineViewLogic);
  const { tabId = SearchApplicationViewTabs.PREVIEW } = useParams<{
    tabId?: string;
  }>();
  const { renderHeaderActions } = useValues(KibanaLogic);

  useLayoutEffect(() => {
    renderHeaderActions(EngineHeaderDocsAction);

    return () => {
      renderHeaderActions();
    };
  }, []);

  useEffect(() => {
    fetchEngine({ name: engineName });
  }, [engineName]);

  if (fetchEngineApiStatus === Status.ERROR) {
    return (
      <EnterpriseSearchApplicationsPageTemplate
        isEmptyState
        pageChrome={[engineName]}
        pageViewTelemetry={tabId}
        pageHeader={{
          bottomBorder: false,
          pageTitle: engineName,
          rightSideItems: [],
        }}
        searchApplicationName={engineName}
        emptyState={<EngineError error={fetchEngineApiError} />}
        hasSchemaConflicts={hasSchemaConflicts}
      />
    );
  }

  return (
    <>
      {isDeleteModalVisible ? (
        <DeleteSearchApplicationModal
          searchApplicationName={engineName}
          onClose={closeDeleteEngineModal}
        />
      ) : null}
      <Switch>
        <Route
          exact
          path={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.PREVIEW}`}
          component={EngineSearchPreview}
        />
        <Route path={SEARCH_APPLICATION_CONTENT_PATH} component={SearchApplicationContent} />
        <Redirect
          from={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONTENT}`}
          to={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONTENT}/${SearchApplicationContentTabs.INDICES}`}
        />
        <Route path={SEARCH_APPLICATION_CONNECT_PATH} component={EngineConnect} />
        <Redirect
          from={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONNECT}`}
          to={`${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONNECT}/${SearchApplicationConnectTabs.SEARCHAPI}`}
        />
        <Route>
          <EnterpriseSearchApplicationsPageTemplate
            isEmptyState
            pageChrome={[engineName]}
            pageViewTelemetry={tabId}
            pageHeader={{
              bottomBorder: false,
              pageTitle: engineName,
              rightSideItems: [],
            }}
            searchApplicationName={engineName}
            hasSchemaConflicts={hasSchemaConflicts}
          >
            <EngineError notFound />
          </EnterpriseSearchApplicationsPageTemplate>
        </Route>
      </Switch>
    </>
  );
};
