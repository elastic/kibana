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
  ENGINE_PATH,
  SEARCH_APPLICATION_CONTENT_PATH,
  SEARCH_APPLICATION_CONNECT_PATH,
  EngineViewTabs,
  SearchApplicationConnectTabs,
  SearchApplicationContentTabs,
} from '../../routes';

import { DeleteEngineModal } from '../engines/delete_engine_modal';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineConnect } from './engine_connect/engine_connect';
import { EngineError } from './engine_error';
import { EngineSearchPreview } from './engine_search_preview/engine_search_preview';
import { EngineViewLogic } from './engine_view_logic';
import { EngineHeaderDocsAction } from './header_docs_action';
import { SearchApplicationContent } from './search_application_content';

export const EngineView: React.FC = () => {
  const { fetchEngine, closeDeleteEngineModal } = useActions(EngineViewLogic);
  const {
    engineName,
    fetchEngineApiError,
    fetchEngineApiStatus,
    hasSchemaConflicts,
    isDeleteModalVisible,
  } = useValues(EngineViewLogic);
  const { tabId = EngineViewTabs.PREVIEW } = useParams<{
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
    fetchEngine({ engineName });
  }, [engineName]);

  if (fetchEngineApiStatus === Status.ERROR) {
    return (
      <EnterpriseSearchEnginesPageTemplate
        isEmptyState
        pageChrome={[engineName]}
        pageViewTelemetry={tabId}
        pageHeader={{
          bottomBorder: false,
          pageTitle: engineName,
          rightSideItems: [],
        }}
        engineName={engineName}
        emptyState={<EngineError error={fetchEngineApiError} />}
        hasSchemaConflicts={hasSchemaConflicts}
      />
    );
  }

  return (
    <>
      {isDeleteModalVisible ? (
        <DeleteEngineModal engineName={engineName} onClose={closeDeleteEngineModal} />
      ) : null}
      <Switch>
        <Route
          exact
          path={`${ENGINE_PATH}/${EngineViewTabs.PREVIEW}`}
          component={EngineSearchPreview}
        />
        <Route path={SEARCH_APPLICATION_CONTENT_PATH} component={SearchApplicationContent} />
        <Redirect
          from={`${ENGINE_PATH}/${EngineViewTabs.CONTENT}`}
          to={`${ENGINE_PATH}/${EngineViewTabs.CONTENT}/${SearchApplicationContentTabs.INDICES}`}
        />
        <Route path={SEARCH_APPLICATION_CONNECT_PATH} component={EngineConnect} />
        <Redirect
          from={`${ENGINE_PATH}/${EngineViewTabs.CONNECT}`}
          to={`${ENGINE_PATH}/${EngineViewTabs.CONNECT}/${SearchApplicationConnectTabs.API}`}
        />
        <Route>
          <EnterpriseSearchEnginesPageTemplate
            isEmptyState
            pageChrome={[engineName]}
            pageViewTelemetry={tabId}
            pageHeader={{
              bottomBorder: false,
              pageTitle: engineName,
              rightSideItems: [],
            }}
            engineName={engineName}
            hasSchemaConflicts={hasSchemaConflicts}
          >
            <EngineError notFound />
          </EnterpriseSearchEnginesPageTemplate>
        </Route>
      </Switch>
    </>
  );
};
