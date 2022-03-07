/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useCallback, useMemo, useReducer } from 'react';
import { EuiLoadingContent, EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Route } from 'react-router-dom';
import type { AppMountParameters } from 'kibana/public';
import { useSideNavItems } from './side_nav';
import * as routes from '../../routing/routes';
import { MlPageWrapper } from '../../routing/ml_page_wrapper';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';
import { MlRoute, PageDependencies } from '../../routing/router';
import { DatePickerWrapper } from '../navigation_menu/date_picker_wrapper';
import { useActiveRoute } from '../../routing/use_active_route';
import {
  KibanaPageTemplate,
  RedirectAppLinks,
} from '../../../../../../../src/plugins/kibana_react/public';
import { useDocTitle } from '../../routing/use_doc_title';

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
export const MlPage: FC<{ pageDeps: PageDependencies }> = React.memo(({ pageDeps }) => {
  const navigateToPath = useNavigateToPath();
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();

  const [pageState, dispatch] = useReducer<typeof pageStateReducer>(pageStateReducer, {});

  const setPageTitle = useCallback(
    (payload) => {
      dispatch({ type: ML_PAGE_ACTION.SET_HEADER, payload });
    },
    [dispatch]
  );

  const routeList = useMemo(
    () => Object.values(routes).map((routeFactory) => routeFactory(navigateToPath, basePath.get())),
    []
  );

  const activeRoute = useActiveRoute(routeList);

  const rightSideItems = useMemo(() => {
    return [...(activeRoute.enableDatePicker ? [<DatePickerWrapper />] : [])];
  }, [activeRoute.enableDatePicker]);

  useDocTitle(activeRoute);

  return (
    <KibanaPageTemplate
      className={'ml-app'}
      data-test-subj={'mlApp'}
      restrictWidth={false}
      // EUI TODO
      // The different template options need to be manually recreated by the individual pages.
      // These classes help enforce the layouts.
      pageContentProps={{ className: 'kbnAppWrapper' }}
      pageContentBodyProps={{ className: 'kbnAppWrapper' }}
      solutionNav={{
        name: i18n.translate('xpack.ml.plugin.title', {
          defaultMessage: 'Machine Learning',
        }),
        icon: 'machineLearningApp',
        items: useSideNavItems(activeRoute),
      }}
      pageHeader={{
        pageTitle: pageState.pageHeader ?? <EuiLoadingContent lines={1} />,
        rightSideItems,
        restrictWidth: false,
      }}
      pageBodyProps={{
        'data-test-subj': activeRoute?.['data-test-subj'],
      }}
    >
      <CommonPageWrapper setPageTitle={setPageTitle} pageDeps={pageDeps} routeList={routeList} />
    </KibanaPageTemplate>
  );
});

interface CommonPageWrapperProps {
  setPageTitle: (title?: React.ReactNode | undefined) => void;
  pageDeps: PageDependencies;
  routeList: MlRoute[];
}

const CommonPageWrapper: FC<CommonPageWrapperProps> = React.memo(
  ({ setPageTitle, pageDeps, routeList }) => {
    const {
      services: { application },
    } = useMlKibana();

    return (
      /** RedirectAppLinks intercepts all <a> tags to use navigateToUrl
       * avoiding full page reload **/
      <RedirectAppLinks application={application}>
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
      </RedirectAppLinks>
    );
  }
);
