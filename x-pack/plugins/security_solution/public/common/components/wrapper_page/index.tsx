/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import styled from 'styled-components';
import { CommonProps, EuiPanel } from '@elastic/eui';
import { KibanaPageTemplate } from '../../../../../../../src/plugins/kibana_react/public';
import { AutoSaveWarningMsg } from '../../../timelines/components/timeline/auto_save_warning';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { AppGlobalStyle } from '../../../common/components/page';
import { gutterTimeline } from '../../../common/lib/helpers';
import { Flyout } from '../../../timelines/components/flyout';
import { MainNavigation } from '../../../app/home/main_navigation';
import { KQLHeaderGlobal } from '../../../app/home/kql_global';
import { IS_DRAGGING_CLASS_NAME } from '../../../common/components/drag_and_drop/drag_classnames';
import { useThrottledResizeObserver } from '../../../common/components/utils';
import { useKibana } from '../../../common/lib/kibana';
import { getTimelineShowStatusByIdSelector } from '../../../timelines/components/flyout/selectors';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useMainNavigationVisibility } from '../../../app/home/temp_collapse_sidenav_context';
import { TimelineId } from '../../../../common/types/timeline';
import { useShowTimeline } from '../../../common/utils/timeline/use_show_timeline';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { DETECTIONS_SUB_PLUGIN_ID } from '../../../../common/constants';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

const ChildrenWrapper = styled(EuiPanel)<{
  $paddingTop: number;
  $noPadding?: boolean;
  $withTimeline?: boolean;
  $globalFullScreen?: boolean;
}>`
  height: ${({ $globalFullScreen }) => ($globalFullScreen ? '100%' : undefined)};
  overflow: auto;
  padding: ${({ $noPadding }) => ($noPadding ? 0 : undefined)};
  padding-top: ${({ $paddingTop }) => $paddingTop}px;
  padding-bottom: ${({ $withTimeline }) => ($withTimeline ? gutterTimeline : undefined)};
`;

const StyledKibanaPageTemplate = styled(KibanaPageTemplate)<{
  $isShowingTimelineOverlay?: boolean;
}>`
  .timeline-bottom-bar {
    background: #ffffff; // Override bottom bar black background
    color: inherit; // Necessary to override the bottom bar 'white text'
    transform: ${(
      { $isShowingTimelineOverlay } // Since the bottom bar wraps the whole overlay now, need to override any transforms when it is open
    ) => ($isShowingTimelineOverlay ? 'none' : 'translateY(calc(100% - 50px))')};
    z-index: ${({ theme }) => theme.eui.euiZLevel8};

    .${IS_DRAGGING_CLASS_NAME} & {
      // When a drag is in process the bottom flyout should slide up to allow a drop
      transform: none;
    }
  }
`;

interface WrapperPageProps {
  children: React.ReactNode;
  noPadding?: boolean;
  noTimeline?: boolean;
  pageHeaderChildren?: React.ReactNode;
  restrictWidth?: boolean | number | string;
  style?: Record<string, string>;
}

export const WrapperPage: React.FC<WrapperPageProps & CommonProps> = React.memo(
  ({ children, className, noPadding, noTimeline, pageHeaderChildren, style, ...otherProps }) => {
    const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
    useEffect(() => {
      setGlobalFullScreen(false); // exit full screen mode on page load
    }, [setGlobalFullScreen]);

    const { application, overlays } = useKibana().services;
    const subPluginId = useRef<string>('');
    const { ref, height = 0 } = useThrottledResizeObserver(300);
    const banners$ = overlays.banners.get$();
    const [headerFixed, setHeaderFixed] = useState<boolean>(true);
    const mainPaddingTop = headerFixed ? height : 0;
    const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
    const { show } = useDeepEqualSelector((state) =>
      getTimelineShowStatus(state, TimelineId.active)
    );

    // TODO: Remove when collapsible side nav is introduced
    const { isCollapsed } = useMainNavigationVisibility();

    useEffect(() => {
      const subscription = banners$.subscribe((banners) => setHeaderFixed(!banners.length));
      return () => subscription.unsubscribe();
    }, [banners$]); // Only un/re-subscribe if the Observable changes

    application.currentAppId$.subscribe((appId) => {
      subPluginId.current = appId ?? '';
    });

    const [showTimeline] = useShowTimeline();

    const { indicesExist } = useSourcererScope(
      subPluginId.current === DETECTIONS_SUB_PLUGIN_ID
        ? SourcererScopeName.detections
        : SourcererScopeName.default
    );

    const shouldShowTimelineBottomBar = indicesExist && showTimeline;
    return (
      <StyledKibanaPageTemplate
        $isShowingTimelineOverlay={show}
        bottomBarProps={{
          className: 'timeline-bottom-bar', // Classname to override bottom bar defaults
          position: 'fixed',
          usePortal: false,
        }}
        bottomBar={
          shouldShowTimelineBottomBar && (
            <>
              <AutoSaveWarningMsg />
              {/* TODO: Pass onAppLeave from context */}
              <Flyout timelineId={TimelineId.active} onAppLeave={() => {}} />
            </>
          )
        }
        paddingSize="none"
        pageHeader={{
          children: pageHeaderChildren,
        }}
        pageSideBar={isCollapsed ? undefined : <MainNavigation />}
        restrictWidth={false}
        template="default"
      >
        <EuiPanel color="subdued" paddingSize="none">
          <KQLHeaderGlobal ref={ref} isFixed={headerFixed} />
        </EuiPanel>
        <ChildrenWrapper
          $globalFullScreen={globalFullScreen}
          $noPadding={noPadding}
          $paddingTop={mainPaddingTop}
          $withTimeline={!noTimeline}
          className="securityPageWrapper"
          data-test-subj="pageContainer"
        >
          {children}
          <AppGlobalStyle />
        </ChildrenWrapper>
      </StyledKibanaPageTemplate>
    );
  }
);
