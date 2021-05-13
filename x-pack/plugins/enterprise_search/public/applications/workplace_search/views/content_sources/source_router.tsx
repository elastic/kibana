/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { Route, Switch, useLocation, useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';
import moment from 'moment';

import { EuiButton, EuiCallOut, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { AppLogic } from '../../app_logic';
import { NAV } from '../../constants';
import { CUSTOM_SERVICE_TYPE } from '../../constants';
import {
  ENT_SEARCH_LICENSE_MANAGEMENT,
  REINDEX_JOB_PATH,
  SOURCE_DETAILS_PATH,
  SOURCE_CONTENT_PATH,
  SOURCE_SCHEMAS_PATH,
  SOURCE_DISPLAY_SETTINGS_PATH,
  SOURCE_SETTINGS_PATH,
  getContentSourcePath as sourcePath,
  getSourcesPath,
} from '../../routes';

import { DisplaySettingsRouter } from './components/display_settings';
import { Overview } from './components/overview';
import { Schema } from './components/schema';
import { SchemaChangeErrors } from './components/schema/schema_change_errors';
import { SourceContent } from './components/source_content';
import { SourceInfoCard } from './components/source_info_card';
import { SourceSettings } from './components/source_settings';
import {
  SOURCE_DISABLED_CALLOUT_TITLE,
  SOURCE_DISABLED_CALLOUT_DESCRIPTION,
  SOURCE_DISABLED_CALLOUT_BUTTON,
} from './constants';
import { SourceLogic } from './source_logic';

export const SourceRouter: React.FC = () => {
  const { sourceId } = useParams() as { sourceId: string };
  const { pathname } = useLocation();
  const { initializeSource, resetSourceState } = useActions(SourceLogic);
  const { contentSource, dataLoading } = useValues(SourceLogic);
  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    initializeSource(sourceId);
    return () => {
      // We only want to reset the state when leaving the source section. Otherwise there is an unwanted flash of UI.
      if (!pathname.includes(sourceId)) resetSourceState();
    };
  }, [pathname]);

  if (dataLoading) return <Loading />;

  const {
    name,
    createdAt,
    serviceType,
    serviceName,
    isFederatedSource,
    supportedByLicense,
  } = contentSource;
  const isCustomSource = serviceType === CUSTOM_SERVICE_TYPE;

  const pageHeader = (
    <>
      <SourceInfoCard
        sourceName={serviceName}
        sourceType={serviceType}
        dateCreated={moment(createdAt).format('MMMM D, YYYY')}
        isFederatedSource={isFederatedSource}
      />
      <EuiHorizontalRule />
    </>
  );

  const callout = (
    <>
      <EuiCallOut title={SOURCE_DISABLED_CALLOUT_TITLE} color="warning" iconType="alert">
        <p>{SOURCE_DISABLED_CALLOUT_DESCRIPTION}</p>
        <EuiButton color="warning" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
          {SOURCE_DISABLED_CALLOUT_BUTTON}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );

  return (
    <>
      {!supportedByLicense && callout}
      {pageHeader}
      <Switch>
        <Route exact path={sourcePath(SOURCE_DETAILS_PATH, sourceId, isOrganization)}>
          <SendTelemetry action="viewed" metric="source_overview" />
          <SetPageChrome trail={[NAV.SOURCES, name || '...']} />
          <Overview />
        </Route>
        <Route exact path={sourcePath(SOURCE_CONTENT_PATH, sourceId, isOrganization)}>
          <SendTelemetry action="viewed" metric="source_content" />
          <SetPageChrome trail={[NAV.SOURCES, name || '...', NAV.CONTENT]} />
          <SourceContent />
        </Route>
        {isCustomSource && (
          <Route path={sourcePath(SOURCE_SCHEMAS_PATH, sourceId, isOrganization)}>
            <SendTelemetry action="viewed" metric="source_schema" />
            <SetPageChrome trail={[NAV.SOURCES, name || '...', NAV.SCHEMA]} />
            <Schema />
          </Route>
        )}
        {isCustomSource && (
          <Route path={getSourcesPath(REINDEX_JOB_PATH, isOrganization)}>
            <SendTelemetry action="viewed" metric="source_schema" />
            <SetPageChrome trail={[NAV.SOURCES, name || '...', NAV.SCHEMA]} />
            <SchemaChangeErrors />
          </Route>
        )}
        {isCustomSource && (
          <Route path={sourcePath(SOURCE_DISPLAY_SETTINGS_PATH, sourceId, isOrganization)}>
            <SendTelemetry action="viewed" metric="source_display_settings" />
            <SetPageChrome trail={[NAV.SOURCES, name || '...', NAV.DISPLAY_SETTINGS]} />
            <DisplaySettingsRouter />
          </Route>
        )}
        <Route exact path={sourcePath(SOURCE_SETTINGS_PATH, sourceId, isOrganization)}>
          <SendTelemetry action="viewed" metric="source_settings" />
          <SetPageChrome trail={[NAV.SOURCES, name || '...', NAV.SETTINGS]} />
          <SourceSettings />
        </Route>
      </Switch>
    </>
  );
};
