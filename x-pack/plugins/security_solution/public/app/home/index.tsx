/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { AppLeaveHandler, AppMountParameters } from '../../../../../../src/core/public';
import { SecuritySolutionAppWrapper } from '../../common/components/page';
import { HelpMenu } from '../../common/components/help_menu';
import { UseUrlState } from '../../common/components/url_state';
import { navTabs } from './home_navigations';
import {
  useInitSourcerer,
  getScopeFromPath,
  useSourcererDataView,
} from '../../common/containers/sourcerer';
import { useUpgradeSecurityPackages } from '../../common/hooks/use_upgrade_security_packages';
import { GlobalHeader } from './global_header';
import { SecuritySolutionTemplateWrapper } from './template_wrapper';

interface HomePageProps {
  children: React.ReactNode;
  onAppLeave: (handler: AppLeaveHandler) => void;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

const HomePageComponent: React.FC<HomePageProps> = ({
  children,
  onAppLeave,
  setHeaderActionMenu,
}) => {
  const { pathname } = useLocation();

  useInitSourcerer(getScopeFromPath(pathname));

  const { browserFields, indexPattern } = useSourcererDataView(getScopeFromPath(pathname));
  // side effect: this will attempt to upgrade the endpoint package if it is not up to date
  // this will run when a user navigates to the Security Solution app and when they navigate between
  // tabs in the app. This is useful for keeping the endpoint package as up to date as possible until
  // a background task solution can be built on the server side. Once a background task solution is available we
  // can remove this.
  useUpgradeSecurityPackages();

  return (
    <SecuritySolutionAppWrapper className="kbnAppWrapper">
      <GlobalHeader setHeaderActionMenu={setHeaderActionMenu} />
      <DragDropContextWrapper browserFields={browserFields}>
        <UseUrlState indexPattern={indexPattern} navTabs={navTabs} />
        <SecuritySolutionTemplateWrapper onAppLeave={onAppLeave}>
          {children}
        </SecuritySolutionTemplateWrapper>
      </DragDropContextWrapper>
      <HelpMenu />
    </SecuritySolutionAppWrapper>
  );
};

HomePageComponent.displayName = 'HomePage';

export const HomePage = React.memo(HomePageComponent);
