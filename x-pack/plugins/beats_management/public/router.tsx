/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { HashRouter, Redirect, Route, Switch } from 'react-router-dom';

import { Header } from './components/layouts/header';
import { BreadcrumbConsumer, RouteWithBreadcrumb } from './components/route_with_breadcrumb';
import { FrontendLibs } from './lib/lib';
import { BeatDetailsPage } from './pages/beat';
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
                  text: i18n.translate('xpack.beatsManagement.router.managementTitle', {
                    defaultMessage: 'Management',
                  }),
                },
                {
                  href: '#/management/beats_management',
                  text: i18n.translate('xpack.beatsManagement.router.beatsTitle', {
                    defaultMessage: 'Beats',
                  }),
                },
                ...breadcrumbs,
              ]}
            />
          )}
        </BreadcrumbConsumer>
        <Switch>
          {!libs.framework.getCurrentUser().roles.includes('beats_admin') &&
            !libs.framework.getCurrentUser().roles.includes('superuser') && (
              <Route render={() => <NoAccessPage />} />
            )}
          <Route
            path="/"
            exact={true}
            render={() => <Redirect from="/" exact={true} to="/overview/beats" />}
          />
          <Route path="/overview" render={(props: any) => <MainPages {...props} libs={libs} />} />
          <RouteWithBreadcrumb
            title={params => {
              return i18n.translate('xpack.beatsManagement.router.beatTitle', {
                defaultMessage: 'Beat: {beatId}',
                values: { beatId: params.beatId },
              });
            }}
            parentBreadcrumbs={[
              {
                text: i18n.translate('xpack.beatsManagement.router.beatsListTitle', {
                  defaultMessage: 'Beats List',
                }),
                href: '#/management/beats_management/overview/beats',
              },
            ]}
            path="/beat/:beatId"
            render={(props: any) => <BeatDetailsPage {...props} libs={libs} />}
          />
          <RouteWithBreadcrumb
            title={params => {
              if (params.action === 'create') {
                return i18n.translate('xpack.beatsManagement.router.createTagTitle', {
                  defaultMessage: 'Create Tag',
                });
              }
              return i18n.translate('xpack.beatsManagement.router.tagTitle', {
                defaultMessage: 'Tag: {tagId}',
                values: { tagId: params.tagid },
              });
            }}
            parentBreadcrumbs={[
              {
                text: i18n.translate('xpack.beatsManagement.router.tagsListTitle', {
                  defaultMessage: 'Tags List',
                }),
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
