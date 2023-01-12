/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams, Route, Switch } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiButtonEmpty } from '@elastic/eui';

import { Status } from '../../../../../common/types/api';

import { docLinks } from '../../../shared/doc_links';
import { ENGINE_PATH, EngineViewTabs } from '../../routes';

import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineError } from './engine_error';
import { EngineIndices } from './engine_indices';
import { EngineViewLogic } from './engine_view_logic';

export const EngineView: React.FC = () => {
  const { fetchEngine } = useActions(EngineViewLogic);
  const { engineName, fetchEngineApiError, fetchEngineApiStatus, isLoadingEngine } =
    useValues(EngineViewLogic);
  const { tabId = EngineViewTabs.OVERVIEW } = useParams<{
    tabId?: string;
  }>();

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
          pageTitle: engineName,
          rightSideItems: [],
        }}
        engineName={engineName}
        emptyState={<EngineError error={fetchEngineApiError} />}
      />
    );
  }

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName]}
      pageViewTelemetry={tabId}
      isLoading={isLoadingEngine}
      pageHeader={{
        pageTitle: engineName,
        rightSideItems: [
          <EuiButtonEmpty
            data-test-subj="engine-documentation-link"
            href={docLinks.appSearchElasticsearchIndexedEngines} // TODO: replace with real docLinks when it's created
            target="_blank"
            iconType="documents"
          >
            Engine Docs
          </EuiButtonEmpty>,
        ],
      }}
      engineName={engineName}
    >
      <Switch>
        <Route exact path={`${ENGINE_PATH}/${EngineViewTabs.INDICES}`} component={EngineIndices} />
      </Switch>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
