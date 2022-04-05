/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import type { EntityType } from '../../../../../../timelines/common';
import { timelineSelectors } from '../../../store/timeline';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useDetailPanel } from '../../side_panel/hooks/use_detail_panel';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { isFullScreen } from '../body/column_headers';
import {
  SCROLLING_DISABLED_CLASS_NAME,
  FULL_SCREEN_TOGGLED_CLASS_NAME,
} from '../../../../../common/constants';
import { FULL_SCREEN } from '../../timeline/body/column_headers/translations';
import { EXIT_FULL_SCREEN } from '../../../../common/components/exit_full_screen/translations';
import {
  useTimelineFullScreen,
  useGlobalFullScreen,
} from '../../../../common/containers/use_full_screen';
import {
  updateTimelineGraphEventId,
  updateTimelineSessionViewSessionId,
  setActiveTabTimeline,
} from '../../../../timelines/store/timeline/actions';
import { detectionsTimelineIds } from '../../../containers/helpers';
import * as i18n from './translations';

const FullScreenButtonIcon = styled(EuiButtonIcon)`
  margin: 4px 0 4px 0;
`;
interface NavigationProps {
  fullScreen: boolean;
  globalFullScreen: boolean;
  onCloseOverlay: () => void;
  timelineId: TimelineId;
  timelineFullScreen: boolean;
  toggleFullScreen: () => void;
  graphEventId?: string;
  activeTab: TimelineTabs;
}

const NavigationComponent: React.FC<NavigationProps> = ({
  fullScreen,
  globalFullScreen,
  onCloseOverlay,
  timelineId,
  timelineFullScreen,
  toggleFullScreen,
  graphEventId,
  activeTab,
}) => {
  const title = useMemo(() => {
    if (timelineId === TimelineId.active) {
      return activeTab === TimelineTabs.graph ? i18n.CLOSE_ANALYZER : i18n.CLOSE_SESSION;
    } else {
      return graphEventId ? i18n.CLOSE_ANALYZER : i18n.CLOSE_SESSION;
    }
  }, [activeTab, graphEventId, timelineId]);
  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty iconType="cross" onClick={onCloseOverlay} size="xs">
          {title}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {timelineId !== TimelineId.active && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={fullScreen ? EXIT_FULL_SCREEN : FULL_SCREEN}>
            <FullScreenButtonIcon
              aria-label={
                isFullScreen({ globalFullScreen, timelineId, timelineFullScreen })
                  ? EXIT_FULL_SCREEN
                  : FULL_SCREEN
              }
              className={fullScreen ? FULL_SCREEN_TOGGLED_CLASS_NAME : ''}
              color={fullScreen ? 'ghost' : 'primary'}
              data-test-subj="full-screen"
              iconType="fullScreen"
              onClick={toggleFullScreen}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
NavigationComponent.displayName = 'NavigationComponent';

const Navigation = React.memo(NavigationComponent);

export const useSessionView = ({
  timelineId,
  entityType,
}: {
  timelineId: TimelineId;
  entityType?: EntityType;
}) => {
  const { sessionView } = useKibana().services;
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();

  const { graphEventId, sessionViewId, activeTab, prevActiveTab } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );
  const onCloseOverlay = useCallback(() => {
    const isDataGridFullScreen = document.querySelector('.euiDataGrid--fullScreen') !== null;
    // Since EUI changes these values directly as a side effect, need to add them back on close.
    if (isDataGridFullScreen) {
      if (timelineId === TimelineId.active) {
        document.body.classList.add('euiDataGrid__restrictBody');
      } else {
        document.body.classList.add(SCROLLING_DISABLED_CLASS_NAME, 'euiDataGrid__restrictBody');
      }
    } else {
      if (timelineId === TimelineId.active) {
        setTimelineFullScreen(false);
      } else {
        setGlobalFullScreen(false);
      }
    }
    if (timelineId !== TimelineId.active) {
      dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: '' }));
      dispatch(updateTimelineSessionViewSessionId({ id: timelineId, eventId: null }));
    } else {
      if (activeTab === TimelineTabs.graph) {
        dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: '' }));
        if (prevActiveTab === TimelineTabs.session && !sessionViewId) {
          dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.query }));
        }
      } else if (activeTab === TimelineTabs.session) {
        dispatch(updateTimelineSessionViewSessionId({ id: timelineId, eventId: null }));
        if (prevActiveTab === TimelineTabs.graph && !graphEventId) {
          dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.query }));
        } else {
          dispatch(setActiveTabTimeline({ id: timelineId, activeTab: prevActiveTab }));
        }
      }
    }
  }, [
    dispatch,
    timelineId,
    setTimelineFullScreen,
    setGlobalFullScreen,
    activeTab,
    prevActiveTab,
    graphEventId,
    sessionViewId,
  ]);
  const fullScreen = useMemo(
    () => isFullScreen({ globalFullScreen, timelineId, timelineFullScreen }),
    [globalFullScreen, timelineId, timelineFullScreen]
  );
  const toggleFullScreen = useCallback(() => {
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
  const sourcererScope = useMemo(() => {
    if (timelineId === TimelineId.active) {
      return SourcererScopeName.timeline;
    } else if (detectionsTimelineIds.includes(timelineId)) {
      return SourcererScopeName.detections;
    } else {
      return SourcererScopeName.default;
    }
  }, [timelineId]);
  const { openDetailsPanel, shouldShowDetailsPanel, DetailsPanel } = useDetailPanel({
    isFlyoutView: timelineId !== TimelineId.active,
    entityType,
    sourcererScope,
    timelineId,
    tabType: timelineId === TimelineId.active ? TimelineTabs.session : TimelineTabs.query,
  });

  const sessionViewComponent = useMemo(() => {
    return sessionViewId !== null
      ? sessionView.getSessionView({
          sessionEntityId: sessionViewId,
          loadAlertDetails: openDetailsPanel,
        })
      : null;
  }, [openDetailsPanel, sessionView, sessionViewId]);

  const navigation = useMemo(() => {
    return (
      <Navigation
        fullScreen={fullScreen}
        globalFullScreen={globalFullScreen}
        activeTab={activeTab}
        onCloseOverlay={onCloseOverlay}
        timelineId={timelineId}
        timelineFullScreen={timelineFullScreen}
        toggleFullScreen={toggleFullScreen}
        graphEventId={graphEventId}
      />
    );
  }, [
    fullScreen,
    globalFullScreen,
    activeTab,
    graphEventId,
    onCloseOverlay,
    timelineFullScreen,
    timelineId,
    toggleFullScreen,
  ]);

  return {
    onCloseOverlay,
    openDetailsPanel,
    shouldShowDetailsPanel,
    SessionView: sessionViewComponent,
    DetailsPanel,
    Navigation: navigation,
  };
};
