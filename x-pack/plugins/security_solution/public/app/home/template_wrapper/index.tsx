/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { CommonProps, EuiPanel } from '@elastic/eui';
import { KibanaPageTemplate } from '../../../../../../../src/plugins/kibana_react/public';
import { TimelineId } from '../../../../common/types/timeline';
import { IS_DRAGGING_CLASS_NAME } from '../../../common/components/drag_and_drop/drag_classnames';
import { getTimelineShowStatusByIdSelector } from '../../../timelines/components/flyout/selectors';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { GlobalKQLHeader } from './global_kql_header';
import {
  BOTTOM_BAR_CLASSNAME,
  SecuritySolutionBottomBar,
  SecuritySolutionBottomBarProps,
} from './bottom_bar';
import { SecuritySolutionNavigationManager } from '../../../common/components/navigation';
import { navTabs } from '../home_navigations';

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
    background: ${({ theme }) =>
      theme.eui.euiColorEmptyShade}; // Override bottom bar black background
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

interface SecuritySolutionPageWrapperProps {
  children: React.ReactNode;
  noPadding?: boolean;
  noTimeline?: boolean;
  restrictWidth?: boolean | number | string;
}

export const SecuritySolutionTemplateWrapper: React.FC<
  SecuritySolutionPageWrapperProps & CommonProps
> = React.memo(({ children }) => {
  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { show: isShowingTimelineOverlay } = useDeepEqualSelector((state) =>
    getTimelineShowStatus(state, TimelineId.active)
  );

  return (
    <StyledKibanaPageTemplate
      $isShowingTimelineOverlay={isShowingTimelineOverlay}
      bottomBarProps={SecuritySolutionBottomBarProps}
      bottomBar={<SecuritySolutionBottomBar />}
      paddingSize="none"
      pageSideBar={<SecuritySolutionNavigationManager navTabs={navTabs} isPrimary />}
      restrictWidth={false}
      template="default"
    >
      <EuiPanel
        color="subdued"
        paddingSize="s"
        style={{ position: 'sticky', top: '96px', zIndex: 100 }}
      >
        <GlobalKQLHeader />
      </EuiPanel>
      <EuiPanel className="securityPageWrapper" data-test-subj="pageContainer">
        {children}
      </EuiPanel>
    </StyledKibanaPageTemplate>
  );
});
