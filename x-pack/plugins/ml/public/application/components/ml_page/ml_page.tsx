/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useEffect, useMemo, useState } from 'react';
import { Subscription } from 'rxjs';
import { EuiPageContentBody_Deprecated as EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Redirect, Route, Switch } from 'react-router-dom';
import type { AppMountParameters } from '@kbn/core/public';
import { KibanaPageTemplate, RedirectAppLinks } from '@kbn/kibana-react-plugin/public';
import { createHtmlPortalNode, HtmlPortalNode } from 'react-reverse-portal';
import { DatePickerWrapper } from '@kbn/ml-date-picker';
import { MlPageHeaderRenderer } from '../page_header/page_header';
import { useSideNavItems } from './side_nav';
import * as routes from '../../routing/routes';
import { MlPageWrapper } from '../../routing/ml_page_wrapper';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';
import { MlRoute, PageDependencies } from '../../routing/router';
import { useActiveRoute } from '../../routing/use_active_route';
import { useDocTitle } from '../../routing/use_doc_title';

export const MlPageControlsContext = createContext<{
  headerPortal: HtmlPortalNode;
  setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
  setIsHeaderMounted: (v: boolean) => void;
  isHeaderMounted: boolean;
}>({
  setHeaderActionMenu: () => {},
  headerPortal: createHtmlPortalNode(),
  isHeaderMounted: false,
  setIsHeaderMounted: () => {},
});

/**
 * Main page component of the ML App
 * @constructor
 */
export const MlPage: FC<{ pageDeps: PageDependencies }> = React.memo(({ pageDeps }) => {
  const navigateToPath = useNavigateToPath();
  const {
    services: {
      http: { basePath },
      mlServices: { httpService },
    },
  } = useMlKibana();

  const headerPortalNode = useMemo(() => createHtmlPortalNode(), []);
  const [isHeaderMounted, setIsHeaderMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const subscriptions = new Subscription();

    subscriptions.add(
      httpService.getLoadingCount$.subscribe((v) => {
        setIsLoading(v !== 0);
      })
    );

    return function cleanup() {
      subscriptions.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeList = useMemo(
    () =>
      Object.values(routes)
        .map((routeFactory) => routeFactory(navigateToPath, basePath.get()))
        .filter((d) => !d.disabled),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const activeRoute = useActiveRoute(routeList);

  const rightSideItems = useMemo(() => {
    return [...(activeRoute.enableDatePicker ? [<DatePickerWrapper isLoading={isLoading} />] : [])];
  }, [activeRoute.enableDatePicker, isLoading]);

  useDocTitle(activeRoute);

  return (
    <MlPageControlsContext.Provider
      value={{
        setHeaderActionMenu: pageDeps.setHeaderActionMenu,
        headerPortal: headerPortalNode,
        setIsHeaderMounted,
        isHeaderMounted,
      }}
    >
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
          pageTitle: <MlPageHeaderRenderer />,
          rightSideItems,
          restrictWidth: false,
        }}
        pageBodyProps={{
          'data-test-subj': activeRoute?.['data-test-subj'],
        }}
      >
        <CommonPageWrapper
          headerPortal={headerPortalNode}
          setIsHeaderMounted={setIsHeaderMounted}
          pageDeps={pageDeps}
          routeList={routeList}
        />
      </KibanaPageTemplate>
    </MlPageControlsContext.Provider>
  );
});

interface CommonPageWrapperProps {
  setIsHeaderMounted: (v: boolean) => void;
  pageDeps: PageDependencies;
  routeList: MlRoute[];
  headerPortal: HtmlPortalNode;
}

const CommonPageWrapper: FC<CommonPageWrapperProps> = React.memo(({ pageDeps, routeList }) => {
  const {
    services: { application },
  } = useMlKibana();

  return (
    /** RedirectAppLinks intercepts all <a> tags to use navigateToUrl
     * avoiding full page reload **/
    <RedirectAppLinks application={application}>
      <EuiPageContentBody restrictWidth={false}>
        <Switch>
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
                    <MlPageWrapper path={route.path}>{route.render(props, pageDeps)}</MlPageWrapper>
                  );
                }}
              />
            );
          })}
          <Redirect to="/overview" />
        </Switch>
      </EuiPageContentBody>
    </RedirectAppLinks>
  );
});
