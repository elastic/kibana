/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useCallback, useMemo, useReducer } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageSideBar,
} from '@elastic/eui';
import { Route } from 'react-router-dom';
import type { AppMountParameters } from 'kibana/public';
import { SideNav } from './side_nav';
import * as routes from '../../routing/routes';
import { MlPageWrapper } from '../../routing/ml_page_wrapper';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';
import { PageDependencies } from '../../routing/router';
import { DatePickerWrapper } from '../navigation_menu/date_picker_wrapper';
import { useActiveRoute } from '../../routing/use_active_route';

export const MlPageControlsContext = createContext<{
  setPageTitle: (v?: React.ReactNode | undefined) => void;
  setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
}>({ setPageTitle: () => {}, setHeaderActionMenu: () => {} });

const ML_PAGE_ACTION = {
  SET_HEADER: 'setPageHeader',
};

interface SetHeaderAction {
  type: typeof ML_PAGE_ACTION.SET_HEADER;
  payload: React.ReactNode;
}

type PageAction = SetHeaderAction;

interface MlPageUIState {
  pageHeader?: React.ReactNode;
}

function pageStateReducer(state: MlPageUIState, action: PageAction): MlPageUIState {
  switch (action.type) {
    case ML_PAGE_ACTION.SET_HEADER:
      return { ...state, pageHeader: action.payload };
  }

  return state;
}

/**
 * Main page component of the ML App
 * @constructor
 */
export const MlPage: FC<{ pageDeps: PageDependencies }> = React.memo(({ pageDeps, children }) => {
  const navigateToPath = useNavigateToPath();
  const { services } = useMlKibana();

  const [pageState, dispatch] = useReducer<typeof pageStateReducer>(pageStateReducer, {});

  const setPageTitle = useCallback(
    (payload) => {
      dispatch({ type: ML_PAGE_ACTION.SET_HEADER, payload });
    },
    [dispatch]
  );

  const {
    http: { basePath },
  } = services;

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
          pageTitle={pageState.pageHeader}
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
          <MlPageControlsContext.Provider
            value={{ setPageTitle, setHeaderActionMenu: pageDeps.setHeaderActionMenu }}
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
          </MlPageControlsContext.Provider>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
});
