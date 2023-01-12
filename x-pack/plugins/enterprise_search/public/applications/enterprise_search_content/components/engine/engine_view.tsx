/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams, Route, Switch } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { Status } from '../../../../../common/types/api';

import { KibanaLogic } from '../../../shared/kibana';
import { ENGINE_PATH, EngineViewTabs } from '../../routes';

import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineError } from './engine_error';
import { EngineIndices } from './engine_indices';
import { EngineViewLogic } from './engine_view_logic';
import { EngineHeaderDocsAction } from './header_docs_action';

export const EngineView: React.FC = () => {
  const { fetchEngine } = useActions(EngineViewLogic);
  const { engineName, fetchEngineApiError, fetchEngineApiStatus, isLoadingEngine } =
    useValues(EngineViewLogic);
  const { tabId = EngineViewTabs.OVERVIEW } = useParams<{
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
    <Switch>
      <Route exact path={`${ENGINE_PATH}/${EngineViewTabs.INDICES}`} component={EngineIndices} />
      <Route // TODO: remove this route when all engine view routes are implemented, replace with a 404 route
        render={() => (
          <EnterpriseSearchEnginesPageTemplate
            pageChrome={[engineName]}
            pageViewTelemetry={tabId}
            pageHeader={{
              pageTitle: tabId,
              rightSideItems: [],
            }}
            engineName={engineName}
            isLoading={isLoadingEngine}
          />
        )}
      />
    </Switch>
  );
};
