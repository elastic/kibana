/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { Route, Routes, useLocation, useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { AppLogic } from '../../app_logic';
import { WorkplaceSearchPageTemplate, PersonalDashboardLayout } from '../../components/layout';
import { NAV, CUSTOM_SERVICE_TYPE } from '../../constants';
import {
  REINDEX_JOB_PATH,
  SOURCE_DETAILS_PATH,
  SOURCE_CONTENT_PATH,
  SOURCE_SCHEMAS_PATH,
  SOURCE_DISPLAY_SETTINGS_PATH,
  SOURCE_SETTINGS_PATH,
  SOURCE_SYNCHRONIZATION_PATH,
  getContentSourcePath as sourcePath,
  getSourcesPath,
} from '../../routes';
import { NotFound } from '../not_found';

import { DisplaySettingsRouter } from './components/display_settings';
import { Overview } from './components/overview';
import { Schema } from './components/schema';
import { SchemaChangeErrors } from './components/schema/schema_change_errors';
import { SourceContent } from './components/source_content';
import { SourceSettings } from './components/source_settings';
import { SynchronizationRouter } from './components/synchronization';
import { SourceLogic } from './source_logic';

export const SourceRouter: React.FC = () => {
  const { sourceId } = useParams() as { sourceId: string };
  const { pathname } = useLocation();
  const { initializeSource, resetSourceState } = useActions(SourceLogic);
  const { contentSource, dataLoading } = useValues(SourceLogic);
  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    initializeSource(sourceId);
  }, [pathname]);

  useEffect(() => {
    return resetSourceState;
  }, []);

  if (dataLoading) {
    return isOrganization ? (
      <WorkplaceSearchPageTemplate isLoading />
    ) : (
      <PersonalDashboardLayout isLoading />
    );
  }

  const { serviceType } = contentSource;
  const isCustomSource = serviceType === CUSTOM_SERVICE_TYPE;
  const showSynchronization = !isCustomSource && isOrganization;

  return (
    <Routes>
      <Route
        path={sourcePath(SOURCE_DETAILS_PATH, sourceId, isOrganization)}
        element={<Overview />}
      />
      <Route
        path={sourcePath(SOURCE_CONTENT_PATH, sourceId, isOrganization)}
        element={<SourceContent />}
      />
      {showSynchronization && (
        <Route
          path={sourcePath(SOURCE_SYNCHRONIZATION_PATH, sourceId, isOrganization)}
          element={<SynchronizationRouter />}
        />
      )}
      {isCustomSource && (
        <Route
          path={sourcePath(SOURCE_SCHEMAS_PATH, sourceId, isOrganization)}
          element={<Schema />}
        />
      )}
      {isCustomSource && (
        <Route
          path={getSourcesPath(REINDEX_JOB_PATH, isOrganization)}
          element={<SchemaChangeErrors />}
        />
      )}
      {isCustomSource && (
        <Route
          path={sourcePath(SOURCE_DISPLAY_SETTINGS_PATH, sourceId, isOrganization)}
          element={<DisplaySettingsRouter />}
        />
      )}
      <Route
        path={sourcePath(SOURCE_SETTINGS_PATH, sourceId, isOrganization)}
        element={<SourceSettings />}
      />
      <Route>
        <NotFound isOrganization={isOrganization} pageChrome={[NAV.SOURCES]} />
      </Route>
    </Routes>
  );
};
