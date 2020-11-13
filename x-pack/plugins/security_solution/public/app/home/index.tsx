/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { TimelineId } from '../../../common/types/timeline';
import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { Flyout } from '../../timelines/components/flyout';
import { SecuritySolutionAppWrapper } from '../../common/components/page';
import { HeaderGlobal } from '../../common/components/header_global';
import { HelpMenu } from '../../common/components/help_menu';
import { AutoSaveWarningMsg } from '../../timelines/components/timeline/auto_save_warning';
import { UseUrlState } from '../../common/components/url_state';
import { useShowTimeline } from '../../common/utils/timeline/use_show_timeline';
import { navTabs } from './home_navigations';
import { useInitSourcerer, useSourcererScope } from '../../common/containers/sourcerer';
import { useKibana } from '../../common/lib/kibana';
import { DETECTIONS_SUB_PLUGIN_ID } from '../../../common/constants';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { useUpgradeEndpointPackage } from '../../common/hooks/endpoint/upgrade';
import { useThrottledResizeObserver } from '../../common/components/utils';

const Main = styled.main.attrs<{ paddingTop: number }>(({ paddingTop }) => ({
  style: {
    paddingTop: `${paddingTop}px`,
  },
}))<{ paddingTop: number }>`
  overflow: auto;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

Main.displayName = 'Main';

const usersViewing = ['elastic']; // TODO: get the users viewing this timeline from Elasticsearch (persistance)

interface HomePageProps {
  children: React.ReactNode;
}

const HomePageComponent: React.FC<HomePageProps> = ({ children }) => {
  const { application, overlays } = useKibana().services;
  const subPluginId = useRef<string>('');
  const { ref, height = 0 } = useThrottledResizeObserver(300);
  const banners$ = overlays.banners.get$();
  const [headerFixed, setHeaderFixed] = useState<boolean>(true);
  const mainPaddingTop = headerFixed ? height : 0;

  useEffect(() => {
    const subscription = banners$.subscribe((banners) => setHeaderFixed(!banners.length));
    return () => subscription.unsubscribe();
  }, [banners$]); // Only un/re-subscribe if the Observable changes

  application.currentAppId$.subscribe((appId) => {
    subPluginId.current = appId ?? '';
  });

  useInitSourcerer(
    subPluginId.current === DETECTIONS_SUB_PLUGIN_ID
      ? SourcererScopeName.detections
      : SourcererScopeName.default
  );
  const [showTimeline] = useShowTimeline();

  const { browserFields, indexPattern, indicesExist } = useSourcererScope(
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
    <SecuritySolutionAppWrapper>
      <HeaderGlobal ref={ref} isFixed={headerFixed} />

      <Main paddingTop={mainPaddingTop} data-test-subj="pageContainer">
        <DragDropContextWrapper browserFields={browserFields}>
          <UseUrlState indexPattern={indexPattern} navTabs={navTabs} />
          {indicesExist && showTimeline && (
            <>
              <AutoSaveWarningMsg />
              <Flyout timelineId={TimelineId.active} usersViewing={usersViewing} />
            </>
          )}

          {children}
        </DragDropContextWrapper>
      </Main>

      <HelpMenu />
    </SecuritySolutionAppWrapper>
  );
};

HomePageComponent.displayName = 'HomePage';

export const HomePage = React.memo(HomePageComponent);
