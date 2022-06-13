/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useMemo, useState } from 'react';
import { EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Redirect, Route, Switch } from 'react-router-dom';
import type { AppMountParameters } from '@kbn/core/public';
import { KibanaPageTemplate, RedirectAppLinks } from '@kbn/kibana-react-plugin/public';
import { createPortalNode, PortalNode } from 'react-reverse-portal';
import { MlPageHeaderRenderer } from '../page_header/page_header';
import { useSideNavItems } from './side_nav';
import * as routes from '../../routing/routes';
import { MlPageWrapper } from '../../routing/ml_page_wrapper';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';
import { MlRoute, PageDependencies } from '../../routing/router';
import { DatePickerWrapper } from '../navigation_menu/date_picker_wrapper';
import { useActiveRoute } from '../../routing/use_active_route';
import { useDocTitle } from '../../routing/use_doc_title';

export const MlPageControlsContext = createContext<{
  headerPortal: PortalNode;
  setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
  setIsHeaderMounted: (v: boolean) => void;
  isHeaderMounted: boolean;
}>({
  setHeaderActionMenu: () => {},
  headerPortal: createPortalNode(),
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
    },
  } = useMlKibana();

  const headerPortalNode = useMemo(() => createPortalNode(), []);
  const [isHeaderMounted, setIsHeaderMounted] = useState(false);

  const routeList = useMemo(
    () =>
      Object.values(routes)
        .map((routeFactory) => routeFactory(navigateToPath, basePath.get()))
        .filter((d) => !d.disabled),
    []
  );

  const activeRoute = useActiveRoute(routeList);

  const rightSideItems = useMemo(() => {
    return [...(activeRoute.enableDatePicker ? [<DatePickerWrapper />] : [])];
  }, [activeRoute.enableDatePicker]);

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
  headerPortal: PortalNode;
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
