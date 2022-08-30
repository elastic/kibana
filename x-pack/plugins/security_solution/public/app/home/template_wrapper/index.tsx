/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiPanel, EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import { IS_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useSecuritySolutionNavigation } from '../../../common/components/navigation/use_security_solution_navigation';
import { TimelineId } from '../../../../common/types/timeline';
import { getTimelineShowStatusByIdSelector } from '../../../timelines/components/flyout/selectors';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { GlobalKQLHeader } from './global_kql_header';
import {
  BOTTOM_BAR_CLASSNAME,
  SecuritySolutionBottomBar,
  SecuritySolutionBottomBarProps,
} from './bottom_bar';
import { useShowTimeline } from '../../../common/utils/timeline/use_show_timeline';
import { gutterTimeline } from '../../../common/lib/helpers';
import { useShowPagesWithEmptyView } from '../../../common/utils/empty_view/use_show_pages_with_empty_view';
import { useIsPolicySettingsBarVisible } from '../../../management/pages/policy/view/policy_hooks';
import { useIsGroupedNavigationEnabled } from '../../../common/components/navigation/helpers';

const NO_DATA_PAGE_MAX_WIDTH = 950;

const NO_DATA_PAGE_TEMPLATE_PROPS = {
  restrictWidth: NO_DATA_PAGE_MAX_WIDTH,
  template: 'centeredBody',
};

/**
 * Need to apply the styles via a className to effect the containing bottom bar
 * rather than applying them to the timeline bar directly
 */
const StyledKibanaPageTemplate = styled(KibanaPageTemplate)<{
  $isShowingTimelineOverlay?: boolean;
  $addBottomPadding?: boolean;
}>`
  .${BOTTOM_BAR_CLASSNAME} {
    animation: 'none !important'; // disable the default bottom bar slide animation
    background: ${({ theme }) =>
      theme.eui.euiColorEmptyShade}; // Override bottom bar black background
    color: inherit; // Necessary to override the bottom bar 'white text'
    transform: ${(
      { $isShowingTimelineOverlay } // Since the bottom bar wraps the whole overlay now, need to override any transforms when it is open
    ) => ($isShowingTimelineOverlay ? 'none' : 'translateY(calc(100% - 50px))')};

    .${IS_DRAGGING_CLASS_NAME} & {
      // When a drag is in process the bottom flyout should slide up to allow a drop
      transform: none;
    }
  }

  // If the bottom bar is visible add padding to the navigation
  ${({ $addBottomPadding }) =>
    $addBottomPadding &&
    `
    @media (min-width: 768px) {
      .kbnSolutionNav {
        padding-bottom: ${gutterTimeline};
      }
    }
  `}
`;

export const SecuritySolutionTemplateWrapper: React.FC<{
  template?: KibanaPageTemplateProps['template'] | 'noData';
}> = React.memo(({ children, template = 'default' }) => {
  const solutionNav = useSecuritySolutionNavigation();
  const isPolicySettingsVisible = useIsPolicySettingsBarVisible();
  const [isTimelineBottomBarVisible] = useShowTimeline();
  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { show: isShowingTimelineOverlay } = useDeepEqualSelector((state) =>
    getTimelineShowStatus(state, TimelineId.active)
  );
  const isGroupedNavEnabled = useIsGroupedNavigationEnabled();
  const addBottomPadding =
    isTimelineBottomBarVisible || isPolicySettingsVisible || isGroupedNavEnabled;

  const showEmptyState = useShowPagesWithEmptyView();

  const emptyStateProps =
    showEmptyState || template === 'noData'
      ? {
          ...NO_DATA_PAGE_TEMPLATE_PROPS,
          template: 'centeredContent' as const,
        }
      : { template };

  // The bottomBar by default has a set 'dark' colorMode that doesn't match the global colorMode from the Advanced Settings
  // To keep the mode in sync, we pass in the globalColorMode to the bottom bar here
  const { colorMode: globalColorMode } = useEuiTheme();
  /*
   * StyledKibanaPageTemplate is a styled EuiPageTemplate. Security solution currently passes the header
   * and page content as the children of StyledKibanaPageTemplate, as opposed to using the pageHeader prop,
   * which may account for any style discrepancies, such as the bottom border not extending the full width of the page,
   * between EuiPageTemplate and the security solution pages.
   */
  return (
    <StyledKibanaPageTemplate
      $addBottomPadding={addBottomPadding}
      $isShowingTimelineOverlay={isShowingTimelineOverlay}
      bottomBarProps={SecuritySolutionBottomBarProps}
      bottomBar={
        isTimelineBottomBarVisible && (
          <EuiThemeProvider colorMode={globalColorMode}>
            <SecuritySolutionBottomBar />
          </EuiThemeProvider>
        )
      }
      paddingSize="none"
      solutionNav={solutionNav}
      restrictWidth={false}
      {...emptyStateProps}
    >
      <>
        <GlobalKQLHeader />
        <EuiPanel
          className="securityPageWrapper"
          data-test-subj="pageContainer"
          hasShadow={false}
          paddingSize="l"
        >
          {children}
        </EuiPanel>
      </>
    </StyledKibanaPageTemplate>
  );
});

SecuritySolutionTemplateWrapper.displayName = 'SecuritySolutionTemplateWrapper';
