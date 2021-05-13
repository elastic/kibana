/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { EuiPanel } from '@elastic/eui';

import { TimelineId } from '../../../common/types/timeline';
import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { Flyout } from '../../timelines/components/flyout';
import { SecuritySolutionAppWrapper } from '../../common/components/page';
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
import { AppLeaveHandler } from '../../../../../../src/core/public';
import { KibanaPageTemplate } from '../../../../../../src/plugins/kibana_react/public';
import { MainNavigation } from './main_navigation';
import { HeaderGlobal } from './header_global';
import { IS_DRAGGING_CLASS_NAME } from '../../common/components/drag_and_drop/helpers';
import { getTimelineShowStatusByIdSelector } from '../../timelines/components/flyout/selectors';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';

const StyledEuiPanel = styled(EuiPanel).attrs<{ paddingTop: number }>(({ paddingTop }) => ({
  style: {
    paddingTop: `${paddingTop}px`,
  },
}))<{ paddingTop: number }>`
  overflow: auto;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const StyledKibanaPageTemplate = styled(KibanaPageTemplate)<{
  $isShowingTimelineOverlay?: boolean;
}>`
  .timeline-bottom-bar {
    background: #ffffff;
    color: inherit;
    transform: ${({ $isShowingTimelineOverlay }) =>
      $isShowingTimelineOverlay ? 'none' : 'translateY(calc(100% - 50px))'};
    z-index: ${({ theme }) => theme.eui.euiZLevel8};

    .${IS_DRAGGING_CLASS_NAME} & {
      transform: none;
    }
  }
`;

interface HomePageProps {
  children: React.ReactNode;
  onAppLeave: (handler: AppLeaveHandler) => void;
}

const HomePageComponent: React.FC<HomePageProps> = ({ children, onAppLeave }) => {
  const { application, overlays } = useKibana().services;
  const subPluginId = useRef<string>('');
  const { ref, height = 0 } = useThrottledResizeObserver(300);
  const banners$ = overlays.banners.get$();
  const [headerFixed, setHeaderFixed] = useState<boolean>(true);
  const mainPaddingTop = headerFixed ? height : 0;
  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { show } = useDeepEqualSelector((state) => getTimelineShowStatus(state, TimelineId.active));

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

  const shouldShowTimelineBottomBar = indicesExist && showTimeline;
  return (
    <SecuritySolutionAppWrapper className="kbnAppWrapper">
      <main className="kbnAppWrapper" data-test-subj="pageContainer">
        <DragDropContextWrapper browserFields={browserFields}>
          <UseUrlState indexPattern={indexPattern} navTabs={navTabs} />
          <StyledKibanaPageTemplate
            paddingSize="none"
            pageSideBar={<MainNavigation />}
            restrictWidth={false}
            template="default"
            $isShowingTimelineOverlay={show}
            bottomBarProps={{
              // Using a classname to target the bottom bar for the show/hide functionality
              className: 'timeline-bottom-bar',
              left: 240,
              position: 'fixed',
              usePortal: false,
            }}
            bottomBar={
              shouldShowTimelineBottomBar && (
                <>
                  <AutoSaveWarningMsg />
                  <Flyout timelineId={TimelineId.active} onAppLeave={onAppLeave} />
                </>
              )
            }
          >
            <EuiPanel color="subdued" paddingSize="none">
              <HeaderGlobal ref={ref} isFixed={headerFixed} />
            </EuiPanel>
            <StyledEuiPanel paddingTop={mainPaddingTop} paddingSize="l" color="transparent">
              {children}
            </StyledEuiPanel>
          </StyledKibanaPageTemplate>
        </DragDropContextWrapper>
      </main>
      <HelpMenu />
    </SecuritySolutionAppWrapper>
  );
};

HomePageComponent.displayName = 'HomePage';

export const HomePage = React.memo(HomePageComponent);
