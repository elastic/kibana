/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageSideBar,
} from '@elastic/eui';
import { Route } from 'react-router-dom';
import { SideNav } from './side_nav';
import * as routes from '../../routing/routes';
import { MlPageWrapper } from '../../routing/ml_page_wrapper';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';
import { PageDependencies } from '../../routing/router';
import { DatePickerWrapper } from '../navigation_menu/date_picker_wrapper';
import { useActiveRoute } from '../../routing/use_active_route';

/**
 * Main page component of the ML App
 * @constructor
 */
export const MlPage: FC<{ pageDeps: PageDependencies }> = React.memo(({ pageDeps, children }) => {
  const navigateToPath = useNavigateToPath();
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();

  const routeList = useMemo(
    () => Object.values(routes).map((routeFactory) => routeFactory(navigateToPath, basePath.get())),
    []
  );

  const activeRoute = useActiveRoute(routeList);

  return (
    <EuiPage paddingSize="none">
      <EuiPageSideBar paddingSize="l">
        <SideNav activeRouteId={activeRoute.id} />
      </EuiPageSideBar>

      <EuiPageBody panelled data-test-subj={activeRoute?.['data-test-subj']}>
        <EuiPageHeader
          restrictWidth={false}
          pageTitle={activeRoute.header}
          rightSideItems={[...(activeRoute.enableDatePicker ? [<DatePickerWrapper />] : [])]}
        />
        <EuiPageContent
          hasBorder={false}
          hasShadow={false}
          grow={true}
          paddingSize="none"
          color="transparent"
          borderRadius="none"
        >
          <EuiPageContentBody restrictWidth={false}>
            {routeList.map((route) => {
              return (
                <Route
                  key={route.id}
                  path={route.path}
                  exact
                  render={(props) => {
                    window.setTimeout(() => {
                      pageDeps.setBreadcrumbs(route.breadcrumbs);
                    });
                    return (
                      <MlPageWrapper path={route.path}>
                        {route.render(props, pageDeps)}
                      </MlPageWrapper>
                    );
                  }}
                />
              );
            })}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
});
