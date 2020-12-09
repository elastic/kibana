/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { History } from 'history';
import { useActions, useValues } from 'kea';
import moment from 'moment';
import { Route, Switch, useHistory, useParams } from 'react-router-dom';

import { EuiButton, EuiCallOut, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import { NAV } from '../../constants';

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

import { AppLogic } from '../../app_logic';

import { Loading } from '../../../shared/loading';

import { CUSTOM_SERVICE_TYPE } from '../../constants';
import { SourceLogic } from './source_logic';

import { DisplaySettingsRouter } from './components/display_settings';
import { Overview } from './components/overview';
import { Schema } from './components/schema';
import { SchemaChangeErrors } from './components/schema/schema_change_errors';
import { SourceContent } from './components/source_content';
import { SourceInfoCard } from './components/source_info_card';
import { SourceSettings } from './components/source_settings';

export const SourceRouter: React.FC = () => {
  const history = useHistory() as History;
  const { sourceId } = useParams() as { sourceId: string };
  const { initializeSource } = useActions(SourceLogic);
  const { contentSource, dataLoading } = useValues(SourceLogic);
  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    initializeSource(sourceId, history);
  }, []);

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
      <EuiCallOut title="Content source is disabled" color="warning" iconType="alert">
        <p>
          Your organization&apos;s license level changed and no longer supports document-level
          permissions.{' '}
        </p>
        <p>Don&apos;t worry: your data is safe. Search has been disabled.</p>
        <p>Upgrade to a Platinum license to re-enable this source.</p>
        <EuiButton href={ENT_SEARCH_LICENSE_MANAGEMENT}>Explore Platinum license</EuiButton>
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
          <SetPageChrome trail={[NAV.SOURCES, name || '...', NAV.OVERVIEW]} />
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
