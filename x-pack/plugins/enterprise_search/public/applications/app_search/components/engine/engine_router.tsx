/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Route, Switch, Redirect, useParams } from 'react-router-dom';
import { useValues, useActions } from 'kea';

import { i18n } from '@kbn/i18n';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { setQueuedErrorMessage } from '../../../shared/flash_messages';
import { AppLogic } from '../../app_logic';

// TODO: Uncomment and add more routes as we migrate them
import {
  ENGINES_PATH,
  ENGINE_PATH,
  ENGINE_ANALYTICS_PATH,
  // ENGINE_DOCUMENTS_PATH,
  // ENGINE_SCHEMA_PATH,
  // ENGINE_CRAWLER_PATH,
  // META_ENGINE_SOURCE_ENGINES_PATH,
  // ENGINE_RELEVANCE_TUNING_PATH,
  // ENGINE_SYNONYMS_PATH,
  // ENGINE_CURATIONS_PATH,
  // ENGINE_RESULT_SETTINGS_PATH,
  // ENGINE_SEARCH_UI_PATH,
  // ENGINE_API_LOGS_PATH,
} from '../../routes';
import { ENGINES_TITLE } from '../engines';
import {
  OVERVIEW_TITLE,
  ANALYTICS_TITLE,
  // DOCUMENTS_TITLE,
  // SCHEMA_TITLE,
  // CRAWLER_TITLE,
  // RELEVANCE_TUNING_TITLE,
  // SYNONYMS_TITLE,
  // CURATIONS_TITLE,
  // RESULT_SETTINGS_TITLE,
  // SEARCH_UI_TITLE,
  // API_LOGS_TITLE,
} from './constants';

import { EngineLogic } from './';

export const EngineRouter: React.FC = () => {
  const {
    myRole: {
      canViewEngineAnalytics,
      // canViewEngineDocuments,
      // canViewEngineSchema,
      // canViewEngineCrawler,
      // canViewMetaEngineSourceEngines,
      // canManageEngineSynonyms,
      // canManageEngineCurations,
      // canManageEngineRelevanceTuning,
      // canManageEngineResultSettings,
      // canManageEngineSearchUi,
      // canViewEngineApiLogs,
    },
  } = useValues(AppLogic);

  const { dataLoading, engineNotFound } = useValues(EngineLogic);
  const { setEngineName, initializeEngine, clearEngine } = useActions(EngineLogic);

  const { engineName } = useParams() as { engineName: string };
  const engineBreadcrumb = [ENGINES_TITLE, engineName];

  useEffect(() => {
    setEngineName(engineName);
    initializeEngine();
    return clearEngine;
  }, [engineName]);

  if (engineNotFound) {
    setQueuedErrorMessage(
      i18n.translate('xpack.enterpriseSearch.appSearch.engine.notFound', {
        defaultMessage: "No engine with name '{engineName}' could be found.",
        values: { engineName },
      })
    );
    return <Redirect to={ENGINES_PATH} />;
  }

  if (dataLoading) return null;

  return (
    <Switch>
      {canViewEngineAnalytics && (
        <Route path={ENGINE_PATH + ENGINE_ANALYTICS_PATH}>
          <SetPageChrome trail={[...engineBreadcrumb, ANALYTICS_TITLE]} />
          <div data-test-subj="AnalyticsTODO">Just testing right now</div>
        </Route>
      )}
      <Route>
        <SetPageChrome trail={[...engineBreadcrumb, OVERVIEW_TITLE]} />
        <div data-test-subj="EngineOverviewTODO">Overview</div>
      </Route>
    </Switch>
  );
};
