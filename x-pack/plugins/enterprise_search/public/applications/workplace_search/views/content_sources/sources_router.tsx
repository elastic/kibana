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
import { hasMultipleConnectorOptions } from '../../utils';

import { AddSource, AddSourceList, GitHubViaApp } from './components/add_source';
import { AddCustomSource } from './components/add_source/add_custom_source';
import { ExternalConnectorConfig } from './components/add_source/add_external_connector';
import { ConfigurationChoice } from './components/add_source/configuration_choice';
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
      {sources.map((sourceData, i) => {
        const { serviceType, externalConnectorAvailable, internalConnectorAvailable } = sourceData;
        const path = `${getSourcesPath(getAddPath(serviceType), isOrganization)}`;
        const defaultOption = internalConnectorAvailable
          ? 'internal'
          : externalConnectorAvailable
          ? 'external'
          : 'custom';
        const showChoice = defaultOption !== 'internal' && hasMultipleConnectorOptions(sourceData);
        return (
          <Route key={i} exact path={path}>
            {showChoice ? (
              <ConfigurationChoice sourceData={sourceData} />
            ) : (
              <Redirect exact from={path} to={`${path}/${defaultOption}`} />
            )}
          </Route>
        );
      })}
      <Route exact path={getSourcesPath(ADD_CUSTOM_PATH, isOrganization)}>
        <AddCustomSource sourceData={staticCustomSourceData} />
      </Route>
      {sources
        .filter((sourceData) => sourceData.internalConnectorAvailable)
        .map((sourceData, i) => {
          const { serviceType, accountContextOnly } = sourceData;
          return (
            <Route
              key={i}
              exact
              path={`${getSourcesPath(getAddPath(serviceType), isOrganization)}/internal`}
            >
              {!hasPlatinumLicense && accountContextOnly ? (
                <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
              ) : (
                <AddSource sourceData={sourceData} />
              )}
            </Route>
          );
        })}
      {sources
        .filter((sourceData) => sourceData.externalConnectorAvailable)
        .map((sourceData, i) => {
          const { serviceType, accountContextOnly } = sourceData;

          return (
            <Route
              key={i}
              exact
              path={`${getSourcesPath(getAddPath(serviceType), isOrganization)}/external`}
            >
              {!hasPlatinumLicense && accountContextOnly ? (
                <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
              ) : (
                <ExternalConnectorConfig sourceData={sourceData} />
              )}
            </Route>
          );
        })}
      {sources
        .filter((sourceData) => sourceData.customConnectorAvailable)
        .map((sourceData, i) => {
          const { serviceType, accountContextOnly } = sourceData;
          return (
            <Route
              key={i}
              exact
              path={`${getSourcesPath(getAddPath(serviceType), isOrganization)}/custom`}
            >
              {!hasPlatinumLicense && accountContextOnly ? (
                <Redirect exact from={ADD_SOURCE_PATH} to={SOURCES_PATH} />
              ) : (
                <AddCustomSource sourceData={sourceData} initialValue={sourceData.name} />
              )}
            </Route>
          );
        })}
      {sources.map((sourceData, i) => (
        <Route
          key={i}
          exact
          path={`${getSourcesPath(getAddPath(sourceData.serviceType), isOrganization)}/connect`}
        >
          <AddSource connect sourceData={sourceData} />
        </Route>
      ))}
      {sources.map((sourceData, i) => (
        <Route
          key={i}
          exact
          path={`${getSourcesPath(
            getAddPath(sourceData.serviceType),
            isOrganization
          )}/reauthenticate`}
        >
          <AddSource reAuthenticate sourceData={sourceData} />
        </Route>
      ))}
      {sources.map((sourceData, i) => {
        if (sourceData.configuration.needsConfiguration)
          return (
            <Route
              key={i}
              exact
              path={`${getSourcesPath(
                getAddPath(sourceData.serviceType),
                isOrganization
              )}/configure`}
            >
              <AddSource configure sourceData={sourceData} />
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
