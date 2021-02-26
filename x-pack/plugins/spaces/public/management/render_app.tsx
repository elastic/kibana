/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Router, Switch, useParams } from 'react-router-dom';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { ManagementAppMountParams } from 'src/plugins/management/public';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';
import { SpacesGridPage } from './spaces_grid';
import { Space } from '../index';
import { ManageSpacePage } from './edit_space';

export function renderApp(
  core: CoreStart,
  { element, history, setBreadcrumbs }: ManagementAppMountParams,
  features: any,
  spacesManager: any
) {
  const { notifications, i18n: i18nStart, application, chrome } = core;

  const title = i18n.translate('xpack.spaces.displayName', {
    defaultMessage: 'Spaces',
  });

  chrome.docTitle.change(title);

  const spacesBreadcrumbs = [
    {
      text: title,
      href: `/`,
    },
  ];

  const SpacesGridPageWithBreadcrumbs = () => {
    setBreadcrumbs(spacesBreadcrumbs);
    return (
      <SpacesGridPage
        capabilities={application.capabilities}
        getFeatures={features.getFeatures}
        notifications={notifications}
        spacesManager={spacesManager}
        history={history}
        getUrlForApp={application.getUrlForApp}
      />
    );
  };

  const CreateSpacePageWithBreadcrumbs = () => {
    setBreadcrumbs([
      ...spacesBreadcrumbs,
      {
        text: i18n.translate('xpack.spaces.management.createSpaceBreadcrumb', {
          defaultMessage: 'Create',
        }),
      },
    ]);

    return (
      <ManageSpacePage
        capabilities={application.capabilities}
        getFeatures={features.getFeatures}
        notifications={notifications}
        spacesManager={spacesManager}
        history={history}
        getUrlForApp={application.getUrlForApp}
      />
    );
  };

  const EditSpacePageWithBreadcrumbs = () => {
    const { spaceId } = useParams<{ spaceId: string }>();

    const onLoadSpace = (space: Space) => {
      setBreadcrumbs([
        ...spacesBreadcrumbs,
        {
          text: space.name,
          href: `/edit/${encodeURIComponent(space.id)}`,
        },
      ]);
    };

    return (
      <ManageSpacePage
        capabilities={application.capabilities}
        getFeatures={features.getFeatures}
        notifications={notifications}
        spacesManager={spacesManager}
        spaceId={spaceId}
        onLoadSpace={onLoadSpace}
        history={history}
        getUrlForApp={application.getUrlForApp}
      />
    );
  };

  render(
    <i18nStart.Context>
      <RedirectAppLinks application={application}>
        <Router history={history}>
          <Switch>
            <Route path={['', '/']} exact>
              <SpacesGridPageWithBreadcrumbs />
            </Route>
            <Route path="/create">
              <CreateSpacePageWithBreadcrumbs />
            </Route>
            <Route path="/edit/:spaceId">
              <EditSpacePageWithBreadcrumbs />
            </Route>
          </Switch>
        </Router>
      </RedirectAppLinks>
    </i18nStart.Context>,
    element
  );

  return () => {
    chrome.docTitle.reset();
    unmountComponentAtNode(element);
  };
}
