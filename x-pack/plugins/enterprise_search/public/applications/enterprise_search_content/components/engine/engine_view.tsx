/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams, Switch } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { Route } from '@kbn/shared-ux-router';

import { Status } from '../../../../../common/types/api';

import { KibanaLogic } from '../../../shared/kibana';
import { ENGINE_PATH, EngineViewTabs } from '../../routes';

import { DeleteEngineModal } from '../engines/delete_engine_modal';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';
import { NotFound } from '../not_found';

import { EngineConnect } from './engine_connect/engine_connect';
import { EngineError } from './engine_error';
import { EngineIndices } from './engine_indices';
import { EngineSchema } from './engine_schema';
import { EngineSearchPreview } from './engine_search_preview/engine_search_preview';
import { EngineViewLogic } from './engine_view_logic';
import { EngineHeaderDocsAction } from './header_docs_action';

export const EngineView: React.FC = () => {
  const { fetchEngine, closeDeleteEngineModal } = useActions(EngineViewLogic);
  const { engineName, fetchEngineApiError, fetchEngineApiStatus, isDeleteModalVisible } =
    useValues(EngineViewLogic);
  const { tabId = EngineViewTabs.PREVIEW } = useParams<{
    tabId?: string;
  }>();
  const { renderHeaderActions } = useValues(KibanaLogic);

  useEffect(() => {
    fetchEngine({ engineName });
    renderHeaderActions(EngineHeaderDocsAction);
  }, [engineName]);

  if (fetchEngineApiStatus === Status.ERROR) {
    return (
      <EnterpriseSearchEnginesPageTemplate
        isEmptyState
        pageChrome={[engineName]}
        pageViewTelemetry={tabId}
        pageHeader={{
          pageTitle: engineName,
          rightSideItems: [],
        }}
        engineName={engineName}
        emptyState={<EngineError error={fetchEngineApiError} />}
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
        <Route exact path={`${ENGINE_PATH}/${EngineViewTabs.INDICES}`} component={EngineIndices} />
        <Route exact path={`${ENGINE_PATH}/${EngineViewTabs.SCHEMA}`} component={EngineSchema} />
        <Route path={`${ENGINE_PATH}/${EngineViewTabs.CONNECT}`} component={EngineConnect} />
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </>
  );
};
