/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import React, { useMemo, useCallback, useRef } from 'react';

import { isActiveTimeline } from '../../../../../helpers';
import { TimelineId } from '../../../../../../common/types/timeline';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../../../common/containers/use_full_screen';
import { StatefulRowRenderersBrowser } from '../../../row_renderers_browser';
import * as i18n from './translations';
import { EXIT_FULL_SCREEN_CLASS_NAME } from '../../../../../common/components/exit_full_screen';
import { LastUpdatedContainer } from '../../footer/last_updated';
import { RowRendererSwitch } from '../../../row_renderer_switch';

export const isFullScreen = ({
  globalFullScreen,
  isActiveTimelines,
  timelineFullScreen,
}: {
  globalFullScreen: boolean;
  isActiveTimelines: boolean;
  timelineFullScreen: boolean;
}) =>
  (isActiveTimelines && timelineFullScreen) || (isActiveTimelines === false && globalFullScreen);

interface Props {
  timelineId: string;
  updatedAt: number;
}

export const ToolbarAdditionalControlsComponent: React.FC<Props> = ({ timelineId, updatedAt }) => {
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();

  const toolTipRef = useRef<EuiToolTip>(null);

  const hideToolTip = () => toolTipRef.current?.hideToolTip();

  const toggleFullScreen = useCallback(() => {
    hideToolTip();
    if (timelineId === TimelineId.active) {
      setTimelineFullScreen(!timelineFullScreen);
    } else {
      setGlobalFullScreen(!globalFullScreen);
    }
  }, [
    timelineId,
    setTimelineFullScreen,
    timelineFullScreen,
    setGlobalFullScreen,
    globalFullScreen,
  ]);
  const fullScreen = useMemo(
    () =>
      isFullScreen({
        globalFullScreen,
        isActiveTimelines: isActiveTimeline(timelineId),
        timelineFullScreen,
      }),
    [globalFullScreen, timelineFullScreen, timelineId]
  );

  return (
    <>
      <RowRendererSwitch timelineId={timelineId} />
      <StatefulRowRenderersBrowser timelineId={timelineId} />
      <LastUpdatedContainer updatedAt={updatedAt} />
      <span className="rightPosition">
        <EuiToolTip
          ref={toolTipRef}
          content={fullScreen ? i18n.EXIT_FULL_SCREEN : i18n.FULL_SCREEN}
        >
          <EuiButtonIcon
            aria-label={fullScreen ? i18n.EXIT_FULL_SCREEN : i18n.FULL_SCREEN}
            className={`${fullScreen ? EXIT_FULL_SCREEN_CLASS_NAME : ''}`}
            color={fullScreen ? 'text' : 'primary'}
            data-test-subj={
              // a full screen button gets created for timeline and for the host page
              // this sets the data-test-subj for each case so that tests can differentiate between them
              isActiveTimeline(timelineId) ? 'full-screen-active' : 'full-screen'
            }
            iconType={fullScreen ? 'fullScreenExit' : 'fullScreen'}
            onClick={toggleFullScreen}
            onMouseOut={hideToolTip}
          />
        </EuiToolTip>
      </span>
    </>
  );
};

export const ToolbarAdditionalControls = React.memo(ToolbarAdditionalControlsComponent);
// eslint-disable-next-line import/no-default-export
export { ToolbarAdditionalControls as default };
