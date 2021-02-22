/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Switch, Redirect, useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { i18n } from '@kbn/i18n';

import { setQueuedErrorMessage } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { AppLogic } from '../../app_logic';

// TODO: Uncomment and add more routes as we migrate them
import {
  ENGINES_PATH,
  ENGINE_ANALYTICS_PATH,
  ENGINE_DOCUMENTS_PATH,
  ENGINE_DOCUMENT_DETAIL_PATH,
  // ENGINE_SCHEMA_PATH,
  // ENGINE_CRAWLER_PATH,
  // META_ENGINE_SOURCE_ENGINES_PATH,
  ENGINE_RELEVANCE_TUNING_PATH,
  // ENGINE_SYNONYMS_PATH,
  ENGINE_CURATIONS_PATH,
  // ENGINE_RESULT_SETTINGS_PATH,
  // ENGINE_SEARCH_UI_PATH,
  // ENGINE_API_LOGS_PATH,
} from '../../routes';
import { AnalyticsRouter } from '../analytics';
import { CurationsRouter } from '../curations';
import { DocumentDetail, Documents } from '../documents';
import { OVERVIEW_TITLE } from '../engine_overview';
import { EngineOverview } from '../engine_overview';
import { ENGINES_TITLE } from '../engines';
import { RelevanceTuning } from '../relevance_tuning';

import { EngineLogic } from './';

export const EngineRouter: React.FC = () => {
  const {
    myRole: {
      canViewEngineAnalytics,
      // canViewEngineDocuments,
      // canViewEngineSchema,
      // canViewEngineCrawler,
      // canViewMetaEngineSourceEngines,
      canManageEngineRelevanceTuning,
      // canManageEngineSynonyms,
      canManageEngineCurations,
      // canManageEngineResultSettings,
      // canManageEngineSearchUi,
      // canViewEngineApiLogs,
    },
  } = useValues(AppLogic);

  const { engineName: engineNameFromUrl } = useParams() as { engineName: string };
  const { engineName, dataLoading, engineNotFound } = useValues(EngineLogic);
  const { setEngineName, initializeEngine, clearEngine } = useActions(EngineLogic);

  useEffect(() => {
    setEngineName(engineNameFromUrl);
    initializeEngine();
    return clearEngine;
  }, [engineNameFromUrl]);

  if (engineNotFound) {
    setQueuedErrorMessage(
      i18n.translate('xpack.enterpriseSearch.appSearch.engine.notFound', {
        defaultMessage: "No engine with name '{engineName}' could be found.",
        values: { engineName },
      })
    );
    return <Redirect to={ENGINES_PATH} />;
  }

  const isLoadingNewEngine = engineName !== engineNameFromUrl;
  if (isLoadingNewEngine || dataLoading) return <Loading />;

  const engineBreadcrumb = [ENGINES_TITLE, engineName];

  return (
    <Switch>
      {canViewEngineAnalytics && (
        <Route path={ENGINE_ANALYTICS_PATH}>
          <AnalyticsRouter engineBreadcrumb={engineBreadcrumb} />
        </Route>
      )}
      <Route path={ENGINE_DOCUMENT_DETAIL_PATH}>
        <DocumentDetail engineBreadcrumb={engineBreadcrumb} />
      </Route>
      <Route path={ENGINE_DOCUMENTS_PATH}>
        <Documents engineBreadcrumb={engineBreadcrumb} />
      </Route>
      {canManageEngineCurations && (
        <Route path={ENGINE_CURATIONS_PATH}>
          <CurationsRouter engineBreadcrumb={engineBreadcrumb} />
        </Route>
      )}
      {canManageEngineRelevanceTuning && (
        <Route path={ENGINE_RELEVANCE_TUNING_PATH}>
          <RelevanceTuning engineBreadcrumb={engineBreadcrumb} />
        </Route>
      )}
      <Route>
        <SetPageChrome trail={[...engineBreadcrumb, OVERVIEW_TITLE]} />
        <EngineOverview />
      </Route>
    </Switch>
  );
};
