/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';

import { Location } from 'history';
import { useActions, useValues } from 'kea';

import { AppLogic } from '../../app_logic';
import {
  GITHUB_ENTERPRISE_SERVER_VIA_APP_SERVICE_TYPE,
  GITHUB_VIA_APP_SERVICE_TYPE,
} from '../../constants';
import {
  ADD_SOURCE_PATH,
  SOURCE_DETAILS_PATH,
  PRIVATE_SOURCES_PATH,
  SOURCES_PATH,
  getSourcesPath,
  getAddPath,
} from '../../routes';

import { AddSource, AddSourceList, GitHubViaApp } from './components/add_source';
import { AddCustomSource } from './components/add_source/add_custom_source';
import { ExternalConnectorConfig } from './components/add_source/add_external_connector';
import { AddSourceBYOIntro } from './components/add_source/add_source_byo_intro';
import { AddSourceChoice } from './components/add_source/add_source_choice';
import { AddSourceIntro } from './components/add_source/add_source_intro';
import { OrganizationSources } from './organization_sources';
import { PrivateSources } from './private_sources';
import { SourceRouter } from './source_router';
import { SourcesLogic } from './sources_logic';

import './sources.scss';

export const SourcesRouter: React.FC = () => {
  const { pathname } = useLocation() as Location;
  const { resetSourcesState } = useActions(SourcesLogic);
  const {
    account: { canCreatePrivateSources },
    isOrganization,
  } = useValues(AppLogic);

  /**
   * React router is not triggering the useEffect callback function in Sources when child links are clicked so this
   * is needed to ensure that the sources state is reset whenever the app changes routes.
   */
  useEffect(() => {
    resetSourcesState();
  }, [pathname]);

  /**
   * When opening `workplace_search/p/sources/add` as a bookmark or reloading this page,
   * Sources router first get rendered *before* it receives the canCreatePrivateSources value.
   * This results in canCreatePrivateSources always being undefined on the first render,
   * and user always getting redirected to `workplace_search/p/sources`.
   * Here we check for this value being present before we render any routes.
   */
  if (canCreatePrivateSources === undefined) {
    return null;
  }

  return (
    <Switch>
      <Route exact path={PRIVATE_SOURCES_PATH}>
        <PrivateSources />
      </Route>
      <Route exact path={SOURCES_PATH}>
        <OrganizationSources />
      </Route>
      <Route exact path={getAddPath(GITHUB_VIA_APP_SERVICE_TYPE)}>
        <GitHubViaApp isGithubEnterpriseServer={false} />
      </Route>
      <Route exact path={getAddPath(GITHUB_ENTERPRISE_SERVER_VIA_APP_SERVICE_TYPE)}>
        <GitHubViaApp isGithubEnterpriseServer />
      </Route>
      <Route
        exact
        path={`${getSourcesPath(getAddPath('external'), isOrganization)}/intro`}
        data-test-subj="ConnectorBYOIntroRoute"
      >
        <AddSourceBYOIntro />
      </Route>
      <Route
        exact
        path={`${getSourcesPath(getAddPath(':serviceType'), isOrganization)}/intro`}
        data-test-subj="ConnectorIntroRoute"
      >
        <AddSourceIntro />
      </Route>
      <Route
        exact
        path={`${getSourcesPath(getAddPath(':serviceType'), isOrganization)}/choice`}
        data-test-subj="ConnectorChoiceRoute"
      >
        <AddSourceChoice />
      </Route>
      <Route
        exact
        path={`${getSourcesPath(getAddPath('external'), isOrganization)}/connector_registration`}
        data-test-subj="ExternalConnectorConfigRoute"
      >
        <ExternalConnectorConfig />
      </Route>
      <Route
        exact
        path={`${getSourcesPath(
          getAddPath('external', ':baseServiceType'),
          isOrganization
        )}/connector_registration`}
        data-test-subj="ExternalConnectorConfigRoute"
      >
        <ExternalConnectorConfig />
      </Route>
      <Route
        exact
        path={`${getSourcesPath(getAddPath('custom'), isOrganization)}/`}
        data-test-subj="AddCustomSourceRoute"
      >
        <AddCustomSource />
      </Route>
      <Route
        exact
        path={`${getSourcesPath(getAddPath('custom', ':baseServiceType'), isOrganization)}/`}
        data-test-subj="AddCustomSourceRoute"
      >
        <AddCustomSource />
      </Route>
      <Route
        exact
        path={`${getSourcesPath(getAddPath(':serviceType'), isOrganization)}/:initialStep?`}
        data-test-subj="AddSourceRoute"
      >
        <AddSource />
      </Route>
      {canCreatePrivateSources ? (
        <Route exact path={getSourcesPath(ADD_SOURCE_PATH, false)}>
          <AddSourceList />
        </Route>
      ) : (
        <Redirect exact from={getSourcesPath(ADD_SOURCE_PATH, false)} to={PRIVATE_SOURCES_PATH} />
      )}
      <Route exact path={getSourcesPath(ADD_SOURCE_PATH, true)}>
        <AddSourceList />
      </Route>
      <Route path={getSourcesPath(SOURCE_DETAILS_PATH, isOrganization)}>
        <SourceRouter />
      </Route>
    </Switch>
  );
};
