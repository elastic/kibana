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

import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';

import {
  DISPLAY_SETTINGS_RESULT_DETAIL_PATH,
  ENT_SEARCH_LICENSE_MANAGEMENT,
  REINDEX_JOB_PATH,
  SOURCE_DETAILS_PATH,
  SOURCE_CONTENT_PATH,
  SOURCE_SCHEMAS_PATH,
  SOURCE_DISPLAY_SETTINGS_PATH,
  SOURCE_SETTINGS_PATH,
  SOURCES_PATH,
  getContentSourcePath as sourcePath,
  getSourcesPath,
} from 'workplace_search/utils/routePaths';

import { AppLogic } from 'workplace_search/App/AppLogic';
import { Loading, SidebarNavigation, AppView } from 'workplace_search/components';
import { CUSTOM_SERVICE_TYPE } from 'workplace_search/constants';
import { SourceLogic } from './SourceLogic';

import { DisplaySettingsRouter } from './components/DisplaySettings';
import { Overview } from './components/Overview';
import { Schema } from './components/Schema';
import { SchemaChangeErrors } from './components/Schema/SchemaChangeErrors';
import { SourceContent } from './components/SourceContent';
import { SourceInfoCard } from './components/SourceInfoCard';
import { SourceSettings } from './components/SourceSettings';

export const SourceRouter: React.FC = () => {
  const history = useHistory() as History;
  const { sourceId } = useParams() as { sourceId: string };
  const { initializeSource } = useActions(SourceLogic);
  const { contentSource, dataLoading } = useValues(SourceLogic);
  const { isOrganization } = useValues(AppLogic);

  const breadcrumbs = {
    topLevelPath: getSourcesPath(SOURCES_PATH, isOrganization),
    topLevelName: '← All content sources',
  };

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

  const overviewLink = {
    title: 'Overview',
    path: sourcePath(SOURCE_DETAILS_PATH, sourceId, isOrganization),
  };
  const contentLink = {
    title: 'Content',
    path: sourcePath(SOURCE_CONTENT_PATH, sourceId, isOrganization),
  };
  const schemaLink = {
    title: 'Schema',
    dataTestSubj: 'SchemaLink',
    path: sourcePath(SOURCE_SCHEMAS_PATH, sourceId, isOrganization),
  };
  const displaySettingsLink = {
    title: 'Display Settings',
    dataTestSubj: 'DisplaySettingsLink',
    path: sourcePath(SOURCE_DISPLAY_SETTINGS_PATH, sourceId, isOrganization),
    otherActivePath: sourcePath(DISPLAY_SETTINGS_RESULT_DETAIL_PATH, sourceId, isOrganization),
  };
  const sourceSettingsLink = {
    title: 'Source settings',
    dataTestSubj: 'SourceSettingsLink',
    path: sourcePath(SOURCE_SETTINGS_PATH, sourceId, isOrganization),
  };

  let sidebarLinks;
  if (isCustomSource) {
    sidebarLinks = [overviewLink, contentLink, schemaLink, displaySettingsLink, sourceSettingsLink];
  } else {
    sidebarLinks = [overviewLink, contentLink, sourceSettingsLink];
  }

  const sidebar = (
    <SidebarNavigation
      title={
        <span className="eui-textOverflowWrap" title={name}>
          {name}
        </span>
      }
      titleCssClass="content-source-title"
      breadcrumbs={breadcrumbs}
      headerChildren={
        <SourceInfoCard
          sourceName={serviceName}
          sourceType={serviceType}
          dateCreated={moment(createdAt).format('MMMM D, YYYY')}
          isFederatedSource={isFederatedSource}
        />
      }
      links={sidebarLinks}
      isFederatedSource={isFederatedSource}
    />
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
    <AppView sidebar={sidebar}>
      {!supportedByLicense && callout}
      <Switch>
        <Route
          exact
          path={sourcePath(SOURCE_DETAILS_PATH, sourceId, isOrganization)}
          component={Overview}
        />
        <Route
          exact
          path={sourcePath(SOURCE_CONTENT_PATH, sourceId, isOrganization)}
          component={SourceContent}
        />
        {isCustomSource && (
          <Route
            path={sourcePath(SOURCE_SCHEMAS_PATH, sourceId, isOrganization)}
            component={Schema}
          />
        )}
        {isCustomSource && (
          <Route
            path={getSourcesPath(REINDEX_JOB_PATH, isOrganization)}
            component={SchemaChangeErrors}
          />
        )}
        {isCustomSource && (
          <Route
            path={sourcePath(SOURCE_DISPLAY_SETTINGS_PATH, sourceId, isOrganization)}
            component={DisplaySettingsRouter}
          />
        )}
        <Route
          exact
          path={sourcePath(SOURCE_SETTINGS_PATH, sourceId, isOrganization)}
          component={SourceSettings}
        />
      </Switch>
    </AppView>
  );
};
