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

import { LicensingLogic } from '../../../shared/licensing';
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
  ADD_CUSTOM_PATH,
} from '../../routes';

import { AddSource, AddSourceList, GitHubViaApp } from './components/add_source';
import { AddCustomSource } from './components/add_source/add_custom_source';
import { ExternalConnectorConfig } from './components/add_source/add_external_connector';
import { AddSourceChoice } from './components/add_source/add_source_choice';
import { AddSourceIntro } from './components/add_source/add_source_intro';
import { OrganizationSources } from './organization_sources';
import { PrivateSources } from './private_sources';
import { staticCustomSourceData, staticSourceData as sources } from './source_data';
import { SourceRouter } from './source_router';
import { SourcesLogic } from './sources_logic';

import './sources.scss';

export const SourcesRouter: React.FC = () => {
  const { pathname } = useLocation() as Location;
  const { hasPlatinumLicense } = useValues(LicensingLogic);
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

  const internalSources = sources.filter(
    (sourceData) => sourceData.serviceType !== 'custom' && sourceData.serviceType !== 'external'
  );
  const externalSources = sources.filter((sourceData) => sourceData.serviceType === 'external');
  const customSources = sources.filter((sourceData) => sourceData.serviceType === 'custom');
  const internalAndExternalSources = [...internalSources, ...externalSources];

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
      <Route exact path={getSourcesPath(ADD_CUSTOM_PATH, isOrganization)}>
        <AddCustomSource sourceData={staticCustomSourceData} />
      </Route>
      {internalSources.map((sourceData, i) => {
        const { serviceType, accountContextOnly } = sourceData;
        return (
          <Route
            key={i}
            exact
            path={`${getSourcesPath(getAddPath(serviceType), isOrganization)}/intro`}
          >
            {!hasPlatinumLicense && accountContextOnly ? (
              <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
            ) : (
              <AddSourceIntro sourceData={sourceData} />
            )}
          </Route>
        );
      })}
      {internalSources.map((sourceData, i) => {
        const { serviceType, accountContextOnly } = sourceData;
        return (
          <Route
            key={i}
            exact
            path={`${getSourcesPath(getAddPath(serviceType), isOrganization)}/choice`}
          >
            {!hasPlatinumLicense && accountContextOnly ? (
              <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
            ) : (
              <AddSourceChoice sourceData={sourceData} />
            )}
          </Route>
        );
      })}
      {internalAndExternalSources.map((sourceData, i) => {
        const { serviceType, accountContextOnly } = sourceData;
        return (
          <Route key={i} exact path={`${getSourcesPath(getAddPath(serviceType), isOrganization)}/`}>
            {!hasPlatinumLicense && accountContextOnly ? (
              <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
            ) : (
              <AddSource sourceData={sourceData} />
            )}
          </Route>
        );
      })}
      {internalAndExternalSources.map((sourceData, i) => (
        <Route
          key={i}
          exact
          path={`${getSourcesPath(
            getAddPath(sourceData.serviceType, sourceData.baseServiceType),
            isOrganization
          )}/connect`}
        >
          <AddSource connect sourceData={sourceData} />
        </Route>
      ))}
      {internalAndExternalSources.map((sourceData, i) => (
        <Route
          key={i}
          exact
          path={`${getSourcesPath(
            getAddPath(sourceData.serviceType, sourceData.baseServiceType),
            isOrganization
          )}/reauthenticate`}
        >
          <AddSource reAuthenticate sourceData={sourceData} />
        </Route>
      ))}
      {internalAndExternalSources.map((sourceData, i) => {
        if (sourceData.configuration.needsConfiguration)
          return (
            <Route
              key={i}
              exact
              path={`${getSourcesPath(
                getAddPath(sourceData.serviceType, sourceData.baseServiceType),
                isOrganization
              )}/configure`}
            >
              <AddSource configure sourceData={sourceData} />
            </Route>
          );
      })}
      {externalSources.map((sourceData, i) => {
        const { baseServiceType, serviceType, accountContextOnly } = sourceData;
        return (
          <Route
            key={i}
            exact
            path={`${getSourcesPath(
              getAddPath(serviceType, baseServiceType),
              isOrganization
            )}/connector_config`}
          >
            {!hasPlatinumLicense && accountContextOnly ? (
              <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
            ) : (
              <ExternalConnectorConfig sourceData={sourceData} />
            )}
          </Route>
        );
      })}
      {customSources.map((sourceData, i) => {
        const { baseServiceType, serviceType, accountContextOnly } = sourceData;
        return (
          <Route
            key={i}
            exact
            path={`${getSourcesPath(getAddPath(serviceType, baseServiceType), isOrganization)}/`}
          >
            {!hasPlatinumLicense && accountContextOnly ? (
              <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
            ) : (
              <AddCustomSource sourceData={sourceData} initialValue={sourceData.name} />
            )}
          </Route>
        );
      })}
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
