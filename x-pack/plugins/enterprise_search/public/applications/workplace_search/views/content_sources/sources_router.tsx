/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { Location } from 'history';
import { useActions, useValues } from 'kea';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';

import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import { LicensingLogic } from '../../../../applications/shared/licensing';

import { NAV } from '../../constants';
import {
  ADD_SOURCE_PATH,
  SOURCE_ADDED_PATH,
  SOURCE_DETAILS_PATH,
  PERSONAL_SOURCES_PATH,
  SOURCES_PATH,
  getSourcesPath,
} from '../../routes';

import { AppLogic } from '../../app_logic';
import { staticSourceData } from './source_data';
import { SourcesLogic } from './sources_logic';

import { AddSource, AddSourceList } from './components/add_source';
import { SourceAdded } from './components/source_added';
import { OrganizationSources } from './organization_sources';
import { PrivateSources } from './private_sources';
import { SourceRouter } from './source_router';

export const SourcesRouter: React.FC = () => {
  const { pathname } = useLocation() as Location;
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { resetSourcesState } = useActions(SourcesLogic);
  const {
    account: { canCreatePersonalSources },
    isOrganization,
  } = useValues(AppLogic);

  /**
   * React router is not triggering the useEffect callback function in Sources when child links are clicked so this
   * is needed to ensure that the sources state is reset whenever the app changes routes.
   */
  useEffect(() => {
    resetSourcesState();
  }, [pathname]);

  return (
    <Switch>
      <Route exact path={PERSONAL_SOURCES_PATH}>
        <SetPageChrome trail={[NAV.SOURCES]} />
        <SendTelemetry action="viewed" metric="personal_sources" />
        <PrivateSources />
      </Route>
      <Route exact path={SOURCES_PATH}>
        <SetPageChrome trail={[NAV.SOURCES]} />
        <SendTelemetry action="viewed" metric="organization_sources" />
        <OrganizationSources />
      </Route>
      {staticSourceData.map(({ addPath, accountContextOnly, name }, i) => (
        <Route key={i} exact path={getSourcesPath(addPath, isOrganization)}>
          <SetPageChrome trail={[NAV.SOURCES, NAV.ADD_SOURCE, name]} />
          {!hasPlatinumLicense && accountContextOnly ? (
            <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
          ) : (
            <AddSource sourceIndex={i} />
          )}
        </Route>
      ))}
      {staticSourceData.map(({ addPath, name }, i) => (
        <Route key={i} exact path={`${getSourcesPath(addPath, isOrganization)}/connect`}>
          <SetPageChrome trail={[NAV.SOURCES, NAV.ADD_SOURCE, name]} />
          <AddSource connect sourceIndex={i} />
        </Route>
      ))}
      {staticSourceData.map(({ addPath, name }, i) => (
        <Route key={i} exact path={`${getSourcesPath(addPath, isOrganization)}/re-authenticate`}>
          <SetPageChrome trail={[NAV.SOURCES, NAV.ADD_SOURCE, name]} />
          <AddSource reAuthenticate sourceIndex={i} />
        </Route>
      ))}
      {staticSourceData.map(({ addPath, name, configuration: { needsConfiguration } }, i) => {
        if (needsConfiguration)
          return (
            <Route key={i} exact path={`${getSourcesPath(addPath, isOrganization)}/configure`}>
              <SetPageChrome trail={[NAV.SOURCES, NAV.ADD_SOURCE, name]} />
              <AddSource configure sourceIndex={i} />
            </Route>
          );
      })}
      {canCreatePersonalSources ? (
        <Route exact path={getSourcesPath(ADD_SOURCE_PATH, false)}>
          <SetPageChrome trail={[NAV.SOURCES, NAV.ADD_SOURCE]} />
          <SendTelemetry action="viewed" metric="add_source" />
          <AddSourceList />
        </Route>
      ) : (
        <Redirect exact from={getSourcesPath(ADD_SOURCE_PATH, false)} to={PERSONAL_SOURCES_PATH} />
      )}
      <Route exact path={getSourcesPath(ADD_SOURCE_PATH, true)}>
        <SetPageChrome trail={[NAV.SOURCES, NAV.ADD_SOURCE]} />
        <AddSourceList />
      </Route>
      <Route path={getSourcesPath(SOURCE_ADDED_PATH, isOrganization)} exact>
        <SetPageChrome trail={[NAV.SOURCES, NAV.ADD_SOURCE]} />
        <SourceAdded />
      </Route>
      <Route path={getSourcesPath(SOURCE_DETAILS_PATH, isOrganization)}>
        <SourceRouter />
      </Route>
    </Switch>
  );
};
