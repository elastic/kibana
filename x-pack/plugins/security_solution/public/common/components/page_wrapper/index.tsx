/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { CommonProps, EuiPanel } from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { KibanaPageTemplate } from '../../../../../../../src/plugins/kibana_react/public';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { AppGlobalStyle } from '../../../common/components/page';
import { gutterTimeline } from '../../../common/lib/helpers';
import { TimelineId } from '../../../../common/types/timeline';
import { IS_DRAGGING_CLASS_NAME } from '../../../common/components/drag_and_drop/drag_classnames';
import { getTimelineShowStatusByIdSelector } from '../../../timelines/components/flyout/selectors';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useThrottledResizeObserver } from '../../../common/components/utils';
import { GlobalKQLHeader } from './global_kql_header';
import {
  BOTTOM_BAR_CLASSNAME,
  SecuritySolutionBottomBar,
  SecuritySolutionBottomBarProps,
} from './bottom_bar';
import { useSecurityPageTemplateNav } from './navigation';

/* eslint-disable react/display-name */

/**
 * Need to apply the styles via a className to effect the containing bottom bar
 * rather than applying them to the timeline bar directly
 */
const StyledKibanaPageTemplate = styled(KibanaPageTemplate)<{
  $isShowingTimelineOverlay?: boolean;
}>`
  .${BOTTOM_BAR_CLASSNAME} {
    animation: 'none !important'; // disable the default bottom bar slide animation
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

const StyledEuiPanel = styled(EuiPanel)<{
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

interface SecuritySolutionPageWrapperProps {
  children: React.ReactNode;
  noPadding?: boolean;
  noTimeline?: boolean;
  pageHeaderChildren?: React.ReactNode;
  restrictWidth?: boolean | number | string;
  style?: Record<string, string>;
}

export const SecuritySolutionPageWrapper: React.FC<
  SecuritySolutionPageWrapperProps & CommonProps
> = React.memo(
  ({ children, className, noPadding, noTimeline, pageHeaderChildren, style, ...otherProps }) => {
    const securityPageTemplateNav = useSecurityPageTemplateNav();
    const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
    useEffect(() => {
      setGlobalFullScreen(false); // exit full screen mode on page load
    }, [setGlobalFullScreen]);
    const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
    const { show: isShowingTimelineOverlay } = useDeepEqualSelector((state) =>
      getTimelineShowStatus(state, TimelineId.active)
    );

    const { overlays } = useKibana().services;
    const { ref, height = 0 } = useThrottledResizeObserver(300);
    const banners$ = overlays.banners.get$();
    const [headerFixed, setHeaderFixed] = useState<boolean>(true);
    const mainPaddingTop = headerFixed ? height : 0;

    // If there are any banners, the kql header should not be fixed
    useEffect(() => {
      const subscription = banners$.subscribe((banners) => setHeaderFixed(!banners.length));
      return () => subscription.unsubscribe();
    }, [banners$]); // Only un/re-subscribe if the Observable changes

    return (
      <StyledKibanaPageTemplate
        $isShowingTimelineOverlay={isShowingTimelineOverlay}
        bottomBarProps={SecuritySolutionBottomBarProps}
        bottomBar={<SecuritySolutionBottomBar />}
        paddingSize="none"
        pageHeader={{ children: pageHeaderChildren }}
        restrictWidth={false}
        solutionNav={securityPageTemplateNav}
        template="default"
      >
        <EuiPanel color="subdued" paddingSize="none">
          <GlobalKQLHeader ref={ref} isFixed={headerFixed} />
        </EuiPanel>
        <StyledEuiPanel
          $globalFullScreen={globalFullScreen}
          $noPadding={noPadding}
          $paddingTop={mainPaddingTop}
          $withTimeline={!noTimeline}
          className="securityPageWrapper"
          data-test-subj="pageContainer"
          {...otherProps}
        >
          {children}
          <AppGlobalStyle />
        </StyledEuiPanel>
      </StyledKibanaPageTemplate>
    );
  }
);
