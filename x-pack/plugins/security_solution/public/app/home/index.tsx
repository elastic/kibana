/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';

import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { SecuritySolutionAppWrapper } from '../../common/components/page';
import { HelpMenu } from '../../common/components/help_menu';
import { UseUrlState } from '../../common/components/url_state';
import { navTabs } from './home_navigations';
import { useInitSourcerer, useSourcererScope } from '../../common/containers/sourcerer';
import { useKibana } from '../../common/lib/kibana';
import { DETECTIONS_SUB_PLUGIN_ID } from '../../../common/constants';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { useUpgradeEndpointPackage } from '../../common/hooks/endpoint/upgrade';
import { GlobalHeader } from './global_header';
interface HomePageProps {
  children: React.ReactNode;
}

const HomePageComponent: React.FC<HomePageProps> = ({ children }) => {
  const { application } = useKibana().services;
  const subPluginId = useRef<string>('');

  application.currentAppId$.subscribe((appId) => {
    subPluginId.current = appId ?? '';
  });

  useInitSourcerer(
    subPluginId.current === DETECTIONS_SUB_PLUGIN_ID
      ? SourcererScopeName.detections
      : SourcererScopeName.default
  );

  const { browserFields, indexPattern } = useSourcererScope(
    subPluginId.current === DETECTIONS_SUB_PLUGIN_ID
      ? SourcererScopeName.detections
      : SourcererScopeName.default
  );
  // side effect: this will attempt to upgrade the endpoint package if it is not up to date
  // this will run when a user navigates to the Security Solution app and when they navigate between
  // tabs in the app. This is useful for keeping the endpoint package as up to date as possible until
  // a background task solution can be built on the server side. Once a background task solution is available we
  // can remove this.
  useUpgradeEndpointPackage();

  return (
    <SecuritySolutionAppWrapper className="kbnAppWrapper">
      <GlobalHeader />
      <DragDropContextWrapper browserFields={browserFields}>
        <UseUrlState indexPattern={indexPattern} navTabs={navTabs} />
        {children}
      </DragDropContextWrapper>
      <HelpMenu />
    </SecuritySolutionAppWrapper>
  );
};

HomePageComponent.displayName = 'HomePage';

export const HomePage = React.memo(HomePageComponent);
