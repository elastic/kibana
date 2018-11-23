/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter, Redirect, Route, Switch } from 'react-router-dom';
import { Header } from './components/layouts/header';
import { BreadcrumbConsumer, RouteWithBreadcrumb } from './components/route_with_breadcrumb';
import { FrontendLibs } from './lib/lib';
import { BeatDetailsPage } from './pages/beat';
import { EnforceSecurityPage } from './pages/enforce_security';
import { InvalidLicensePage } from './pages/invalid_license';
import { MainPages } from './pages/main';
import { NoAccessPage } from './pages/no_access';
import { TagPage } from './pages/tag';

export const PageRouter: React.SFC<{ libs: FrontendLibs }> = ({ libs }) => {
  return (
    <HashRouter basename="/management/beats_management">
      <div>
        <BreadcrumbConsumer>
          {({ breadcrumbs }) => (
            <Header
              breadcrumbs={[
                {
                  href: '#/management',
                  text: 'Management',
                },
                {
                  href: '#/management/beats_management',
                  text: 'Beats',
                },
                ...breadcrumbs,
              ]}
            />
          )}
        </BreadcrumbConsumer>
        <Switch>
          {libs.framework.licenseExpired() && <Route render={() => <InvalidLicensePage />} />}
          {!libs.framework.securityEnabled() && <Route render={() => <EnforceSecurityPage />} />}
          {!libs.framework.getCurrentUser() ||
            (!libs.framework.getCurrentUser().roles.includes('beats_admin') &&
              !libs.framework
                .getDefaultUserRoles()
                .some(r => libs.framework.getCurrentUser().roles.includes(r)) && (
                <Route render={() => <NoAccessPage />} />
              ))}
          <Route
            path="/"
            exact={true}
            render={() => <Redirect from="/" exact={true} to="/overview/beats" />}
          />
          <Route path="/overview" render={(props: any) => <MainPages {...props} libs={libs} />} />
          <RouteWithBreadcrumb
            title={params => {
              return `Beats: ${params.beatId}`;
            }}
            parentBreadcrumbs={[
              {
                text: 'Beats List',
                href: '#/management/beats_management/overview/beats',
              },
            ]}
            path="/beat/:beatId"
            render={(props: any) => <BeatDetailsPage {...props} libs={libs} />}
          />
          <RouteWithBreadcrumb
            title={params => {
              if (params.action === 'create') {
                return 'Create Tag';
              }
              return `Tag: ${params.tagid}`;
            }}
            parentBreadcrumbs={[
              {
                text: 'Tags List',
                href: '#/management/beats_management/overview/tags',
              },
            ]}
            path="/tag/:action/:tagid?"
            render={(props: any) => <TagPage {...props} libs={libs} />}
          />
        </Switch>
      </div>
    </HashRouter>
  );
};
