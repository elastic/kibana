/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Routes, Navigate, useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { i18n } from '@kbn/i18n';

import { setQueuedErrorMessage } from '../../../shared/flash_messages';
import { AppLogic } from '../../app_logic';

import {
  ENGINE_PATH,
  ENGINES_PATH,
  ENGINE_ANALYTICS_PATH,
  ENGINE_DOCUMENTS_PATH,
  ENGINE_DOCUMENT_DETAIL_PATH,
  ENGINE_SCHEMA_PATH,
  ENGINE_CRAWLER_PATH,
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
import { CrawlerRouter } from '../crawler';
import { CurationsRouter } from '../curations';
import { DocumentDetail, Documents } from '../documents';
import { EngineOverview } from '../engine_overview';
import { AppSearchPageTemplate } from '../layout';
import { NotFound } from '../not_found';
import { RelevanceTuning } from '../relevance_tuning';
import { ResultSettings } from '../result_settings';
import { SchemaRouter } from '../schema';
import { SearchUI } from '../search_ui';
import { SourceEngines } from '../source_engines';
import { Synonyms } from '../synonyms';

import { EngineLogic, getEngineBreadcrumbs } from '.';

export const EngineRouter: React.FC = () => {
  const {
    myRole: {
      canViewEngineAnalytics,
      canViewEngineDocuments,
      canViewEngineSchema,
      canViewEngineCrawler,
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
  const { engineName, dataLoading, engineNotFound, isMetaEngine } = useValues(EngineLogic);
  const { setEngineName, initializeEngine, pollEmptyEngine, stopPolling, clearEngine } =
    useActions(EngineLogic);

  useEffect(() => {
    setEngineName(engineNameFromUrl);
    initializeEngine();
    pollEmptyEngine();

    return () => {
      stopPolling();
      clearEngine();
    };
  }, [engineNameFromUrl]);

  if (engineNotFound) {
    setQueuedErrorMessage(
      i18n.translate('xpack.enterpriseSearch.appSearch.engine.notFound', {
        defaultMessage: "No engine with name '{engineName}' could be found.",
        values: { engineName },
      })
    );
    return <Navigate to={ENGINES_PATH} />;
  }

  const isLoadingNewEngine = engineName !== engineNameFromUrl;
  if (isLoadingNewEngine || dataLoading) return <AppSearchPageTemplate isLoading />;

  return (
    <Routes>
      <Route path={ENGINE_PATH} element={<EngineOverview />} />
      {canViewEngineAnalytics && (
        <Route path={ENGINE_ANALYTICS_PATH} element={<AnalyticsRouter />} />
      )}
      {canViewEngineDocuments && (
        <Route path={ENGINE_DOCUMENT_DETAIL_PATH} element={<DocumentDetail />} />
      )}
      {canViewEngineDocuments && <Route path={ENGINE_DOCUMENTS_PATH} element={<Documents />} />}
      {canViewEngineSchema && <Route path={ENGINE_SCHEMA_PATH} element={<SchemaRouter />} />}
      {canViewMetaEngineSourceEngines && isMetaEngine && (
        <Route path={META_ENGINE_SOURCE_ENGINES_PATH} element={<SourceEngines />} />
      )}
      {canViewEngineCrawler && !isMetaEngine && (
        <Route path={ENGINE_CRAWLER_PATH} element={<CrawlerRouter />} />
      )}
      {canManageEngineRelevanceTuning && (
        <Route path={ENGINE_RELEVANCE_TUNING_PATH} element={<RelevanceTuning />} />
      )}
      {canManageEngineSynonyms && <Route path={ENGINE_SYNONYMS_PATH} element={<Synonyms />} />}
      {canManageEngineCurations && (
        <Route path={ENGINE_CURATIONS_PATH} element={<CurationsRouter />} />
      )}
      {canManageEngineResultSettings && (
        <Route path={ENGINE_RESULT_SETTINGS_PATH} element={<ResultSettings />} />
      )}
      {canManageEngineSearchUi && <Route path={ENGINE_SEARCH_UI_PATH} element={<SearchUI />} />}
      {canViewEngineApiLogs && <Route path={ENGINE_API_LOGS_PATH} element={<ApiLogs />} />}
      <Route>
        <NotFound pageChrome={getEngineBreadcrumbs()} />
      </Route>
    </Routes>
  );
};
