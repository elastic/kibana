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

import {
  ENGINES_PATH,
  ENGINE_ANALYTICS_PATH,
  ENGINE_DOCUMENTS_PATH,
  ENGINE_DOCUMENT_DETAIL_PATH,
  ENGINE_SCHEMA_PATH,
  // ENGINE_CRAWLER_PATH,
  META_ENGINE_SOURCE_ENGINES_PATH,
  ENGINE_RELEVANCE_TUNING_PATH,
  ENGINE_SYNONYMS_PATH,
  ENGINE_CURATIONS_PATH,
  ENGINE_RESULT_SETTINGS_PATH,
  ENGINE_SEARCH_UI_PATH,
  ENGINE_API_LOGS_PATH,
} from '../../routes';
import { AnalyticsRouter } from '../analytics';
import { ApiLogs } from '../api_logs';
import { CurationsRouter } from '../curations';
import { DocumentDetail, Documents } from '../documents';
import { EngineOverview } from '../engine_overview';
import { RelevanceTuning } from '../relevance_tuning';
import { ResultSettings } from '../result_settings';
import { SchemaRouter } from '../schema';
import { SearchUI } from '../search_ui';
import { SourceEngines } from '../source_engines';
import { Synonyms } from '../synonyms';

import { EngineLogic, getEngineBreadcrumbs } from './';

export const EngineRouter: React.FC = () => {
  const {
    myRole: {
      canViewEngineAnalytics,
      canViewEngineDocuments,
      canViewEngineSchema,
      // canViewEngineCrawler,
      canViewMetaEngineSourceEngines,
      canManageEngineRelevanceTuning,
      canManageEngineSynonyms,
      canManageEngineCurations,
      canManageEngineResultSettings,
      canManageEngineSearchUi,
      canViewEngineApiLogs,
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

  return (
    <Switch>
      {canViewEngineAnalytics && (
        <Route path={ENGINE_ANALYTICS_PATH}>
          <AnalyticsRouter />
        </Route>
      )}
      {canViewEngineDocuments && (
        <Route path={ENGINE_DOCUMENT_DETAIL_PATH}>
          <DocumentDetail />
        </Route>
      )}
      {canViewEngineDocuments && (
        <Route path={ENGINE_DOCUMENTS_PATH}>
          <Documents />
        </Route>
      )}
      {canViewEngineSchema && (
        <Route path={ENGINE_SCHEMA_PATH}>
          <SchemaRouter />
        </Route>
      )}
      {canManageEngineCurations && (
        <Route path={ENGINE_CURATIONS_PATH}>
          <CurationsRouter />
        </Route>
      )}
      {canManageEngineRelevanceTuning && (
        <Route path={ENGINE_RELEVANCE_TUNING_PATH}>
          <RelevanceTuning />
        </Route>
      )}
      {canManageEngineSynonyms && (
        <Route path={ENGINE_SYNONYMS_PATH}>
          <Synonyms />
        </Route>
      )}
      {canManageEngineResultSettings && (
        <Route path={ENGINE_RESULT_SETTINGS_PATH}>
          <ResultSettings />
        </Route>
      )}
      {canViewEngineApiLogs && (
        <Route path={ENGINE_API_LOGS_PATH}>
          <ApiLogs />
        </Route>
      )}
      {canManageEngineSearchUi && (
        <Route path={ENGINE_SEARCH_UI_PATH}>
          <SearchUI />
        </Route>
      )}
      {canViewMetaEngineSourceEngines && (
        <Route path={META_ENGINE_SOURCE_ENGINES_PATH}>
          <SourceEngines />
        </Route>
      )}
      <Route>
        <SetPageChrome trail={getEngineBreadcrumbs()} />
        <EngineOverview />
      </Route>
    </Switch>
  );
};
