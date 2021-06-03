/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { useMemo, useRef } from 'react';
import styled from 'styled-components';
import { KibanaPageTemplateProps } from '../../../../../../../../src/plugins/kibana_react/public';
import { useKibana } from '../../../../common/lib/kibana';
import { IS_DRAGGING_CLASS_NAME } from '../../../../common/components/drag_and_drop/drag_classnames';
import { useShowTimeline } from '../../../../common/utils/timeline/use_show_timeline';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { DETECTIONS_SUB_PLUGIN_ID } from '../../../../../common/constants';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { getTimelineShowStatusByIdSelector } from '../../../../timelines/components/flyout/selectors';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineId } from '../../../../../common/types/timeline';
import { AutoSaveWarningMsg } from '../../../../timelines/components/timeline/auto_save_warning';
import { Flyout } from '../../../../timelines/components/flyout';
import { useAppMountContext } from '../../../../app/app_mount_context';

const bottomBarClassName = 'timeline-bottom-bar';

const StyledBottomBar = styled.span<{ $isShowingTimelineOverlay?: boolean }>`
  .${bottomBarClassName} {
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

export const SecuritySolutionBottomBar = React.memo(() => {
  const subPluginId = useRef<string>('');
  const { onAppLeave } = useAppMountContext();
  const { application } = useKibana().services;
  application.currentAppId$.subscribe((appId) => {
    subPluginId.current = appId ?? '';
  });
  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { show } = useDeepEqualSelector((state) => getTimelineShowStatus(state, TimelineId.active));

  const [showTimeline] = useShowTimeline();

  const { indicesExist } = useSourcererScope(
    subPluginId.current === DETECTIONS_SUB_PLUGIN_ID
      ? SourcererScopeName.detections
      : SourcererScopeName.default
  );

  return indicesExist && showTimeline ? (
    <StyledBottomBar $isShowingTimelineOverlay={show}>
      <AutoSaveWarningMsg />
      <Flyout timelineId={TimelineId.active} onAppLeave={onAppLeave} />
    </StyledBottomBar>
  ) : null;
});

export const SecuritySolutionBottomBarProps: KibanaPageTemplateProps['bottomBarProps'] = {
  className: bottomBarClassName,
  position: 'fixed',
  usePortal: false,
};
