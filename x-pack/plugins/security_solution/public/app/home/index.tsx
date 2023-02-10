/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

import type { AppMountParameters } from '@kbn/core/public';
import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { SecuritySolutionAppWrapper } from '../../common/components/page';

import { HelpMenu } from '../../common/components/help_menu';
import {
  useInitSourcerer,
  getScopeFromPath,
  useSourcererDataView,
} from '../../common/containers/sourcerer';
import { useUpgradeSecurityPackages } from '../../common/hooks/use_upgrade_security_packages';
import { GlobalHeader } from './global_header';
import { ConsoleManager } from '../../management/components/console/components/console_manager';

import { TourContextProvider } from '../../common/components/guided_onboarding_tour';

import { useUrlState } from '../../common/hooks/use_url_state';
import { useUpdateBrowserTitle } from '../../common/hooks/use_update_browser_title';

interface HomePageProps {
  children: React.ReactNode;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

const HomePageComponent: React.FC<HomePageProps> = ({ children, setHeaderActionMenu }) => {
  const { pathname } = useLocation();
  useInitSourcerer(getScopeFromPath(pathname));
  useUrlState();
  useUpdateBrowserTitle();

  const { browserFields } = useSourcererDataView(getScopeFromPath(pathname));
  // side effect: this will attempt to upgrade the endpoint package if it is not up to date
  // this will run when a user navigates to the Security Solution app and when they navigate between
  // tabs in the app. This is useful for keeping the endpoint package as up to date as possible until
  // a background task solution can be built on the server side. Once a background task solution is available we
  // can remove this.
  useUpgradeSecurityPackages();

  return (
    <SecuritySolutionAppWrapper id="security-solution-app" className="kbnAppWrapper">
      <ConsoleManager>
        <TourContextProvider>
          <>
            <GlobalHeader setHeaderActionMenu={setHeaderActionMenu} />
            <DragDropContextWrapper browserFields={browserFields}>
              {children}
            </DragDropContextWrapper>
            <HelpMenu />
          </>
        </TourContextProvider>
      </ConsoleManager>
    </SecuritySolutionAppWrapper>
  );
};

HomePageComponent.displayName = 'HomePage';

export const HomePage = React.memo(HomePageComponent);
