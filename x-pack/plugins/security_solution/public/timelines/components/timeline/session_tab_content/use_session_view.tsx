/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';
import type { EntityType } from '@kbn/timelines-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import type { TableId } from '../../../../../common/types/timeline';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { useDetailPanel } from '../../side_panel/hooks/use_detail_panel';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { isFullScreen } from '../body/column_headers';
import {
  SCROLLING_DISABLED_CLASS_NAME,
  FULL_SCREEN_TOGGLED_CLASS_NAME,
} from '../../../../../common/constants';
import { FULL_SCREEN } from '../body/column_headers/translations';
import { EXIT_FULL_SCREEN } from '../../../../common/components/exit_full_screen/translations';
import {
  useTimelineFullScreen,
  useGlobalFullScreen,
} from '../../../../common/containers/use_full_screen';
import { detectionsTimelineIds } from '../../../containers/helpers';

export interface SessionViewConfig {
  sessionEntityId: string;
  jumpToEntityId?: string;
  jumpToCursor?: string;
  investigatedAlertId?: string;
}

const FullScreenButtonIcon = styled(EuiButtonIcon)`
  margin: 4px 0 4px 0;
`;

interface NavigationProps {
  fullScreen: boolean;
  globalFullScreen: boolean;
  onCloseOverlay: () => void;
  isInTimeline: boolean;
  timelineFullScreen: boolean;
  toggleFullScreen: () => void;
  graphEventId?: string;
  activeTab?: TimelineTabs;
}

const NavigationComponent: React.FC<NavigationProps> = ({
  fullScreen,
  globalFullScreen,
  onCloseOverlay,
  isInTimeline,
  timelineFullScreen,
  toggleFullScreen,
  graphEventId,
  activeTab = TimelineTabs.graph,
}) => {
  const title = () => {
    if (isInTimeline) {
      return activeTab === TimelineTabs.graph ? i18n.CLOSE_ANALYZER : i18n.CLOSE_SESSION;
    } else {
      return graphEventId ? i18n.CLOSE_ANALYZER : i18n.CLOSE_SESSION;
    }
  };
  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty iconType="cross" onClick={onCloseOverlay} size="xs">
          {title()}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {isInTimeline === false && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={fullScreen ? EXIT_FULL_SCREEN : FULL_SCREEN}>
            <FullScreenButtonIcon
              aria-label={
                isFullScreen({
                  globalFullScreen,
                  isInTimeline: false,
                  timelineFullScreen,
                })
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

export const useSessionViewNavigation = ({
  isInTimeline,
  graphEventId,
  sessionViewConfig,
  activeTab,
  prevActiveTab,
  setActiveTabTimeline,
  updateGraphEventId,
  updateSessionViewConfig,
}: {
  graphEventId?: string;
  updateGraphEventId: (graphEventId: string) => void;
  isInTimeline: boolean;
  updateSessionViewConfig: (sessionViewConfig: SessionViewConfig | null) => void;
  setActiveTabTimeline?: (activeTab: TimelineTabs) => void;
  sessionViewConfig: SessionViewConfig | null;
  activeTab?: TimelineTabs;
  prevActiveTab?: TimelineTabs;
}) => {
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();

  const onCloseOverlay = useCallback(() => {
    const isDataGridFullScreen = document.querySelector('.euiDataGrid--fullScreen') !== null;
    // Since EUI changes these values directly as a side effect, need to add them back on close.
    if (isDataGridFullScreen) {
      if (isInTimeline) {
        document.body.classList.add('euiDataGrid__restrictBody');
      } else {
        document.body.classList.add(SCROLLING_DISABLED_CLASS_NAME, 'euiDataGrid__restrictBody');
      }
    } else {
      if (isInTimeline) {
        setTimelineFullScreen(false);
      } else {
        setGlobalFullScreen(false);
      }
    }
    if (isInTimeline === false) {
      updateGraphEventId('');
      updateSessionViewConfig(null);
    } else if (setActiveTabTimeline) {
      if (activeTab === TimelineTabs.graph) {
        updateGraphEventId('');
        if (prevActiveTab === TimelineTabs.session && !sessionViewConfig) {
          setActiveTabTimeline(TimelineTabs.query);
        }
      } else if (activeTab === TimelineTabs.session) {
        updateSessionViewConfig(null);
        if (prevActiveTab === TimelineTabs.graph && !graphEventId) {
          setActiveTabTimeline(TimelineTabs.query);
        } else if (prevActiveTab) {
          setActiveTabTimeline(prevActiveTab);
        }
      }
    }
  }, [
    isInTimeline,
    setActiveTabTimeline,
    setTimelineFullScreen,
    setGlobalFullScreen,
    updateGraphEventId,
    updateSessionViewConfig,
    activeTab,
    prevActiveTab,
    sessionViewConfig,
    graphEventId,
  ]);
  const fullScreen = useMemo(
    () =>
      isFullScreen({
        globalFullScreen,
        isInTimeline,
        timelineFullScreen,
      }),
    [globalFullScreen, isInTimeline, timelineFullScreen]
  );
  const toggleFullScreen = useCallback(() => {
    if (isInTimeline) {
      setTimelineFullScreen(!timelineFullScreen);
    } else {
      setGlobalFullScreen(!globalFullScreen);
    }
  }, [
    isInTimeline,
    setTimelineFullScreen,
    timelineFullScreen,
    setGlobalFullScreen,
    globalFullScreen,
  ]);
  const navigation = useMemo(() => {
    return (
      <Navigation
        fullScreen={fullScreen}
        globalFullScreen={globalFullScreen}
        activeTab={activeTab}
        onCloseOverlay={onCloseOverlay}
        isInTimeline={isInTimeline}
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
    isInTimeline,
    toggleFullScreen,
  ]);

  return {
    onCloseOverlay,
    Navigation: navigation,
  };
};

export const useSessionView = ({
  scopeId,
  entityType,
  height,
  activeTab = TimelineTabs.query,
  sessionViewConfig,
  isInTimeline,
}: {
  scopeId: string;
  entityType?: EntityType;
  height?: number;
  sessionViewConfig: SessionViewConfig | null;
  activeTab?: TimelineTabs;
  isInTimeline: boolean;
}) => {
  const { sessionView } = useKibana().services;
  const { globalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen } = useTimelineFullScreen();

  const fullScreen = useMemo(
    () =>
      isFullScreen({
        globalFullScreen,
        isInTimeline,
        timelineFullScreen,
      }),
    [globalFullScreen, isInTimeline, timelineFullScreen]
  );

  const sourcererScope = useMemo(() => {
    if (isInTimeline) {
      return SourcererScopeName.timeline;
    } else if (detectionsTimelineIds.includes(scopeId as TableId)) {
      return SourcererScopeName.detections;
    } else {
      return SourcererScopeName.default;
    }
  }, [scopeId, isInTimeline]);
  const { openDetailsPanel, shouldShowDetailsPanel, DetailsPanel } = useDetailPanel({
    isFlyoutView: !isInTimeline,
    entityType,
    sourcererScope,
    scopeId,
    tabType: activeTab,
  });

  const sessionViewComponent = useMemo(() => {
    const sessionViewSearchBarHeight = 118;
    const heightMinusSearchBar = height ? height - sessionViewSearchBarHeight : undefined;
    return sessionViewConfig !== null
      ? sessionView.getSessionView({
          ...sessionViewConfig,
          loadAlertDetails: openDetailsPanel,
          isFullScreen: fullScreen,
          height: heightMinusSearchBar,
        })
      : null;
  }, [fullScreen, openDetailsPanel, sessionView, sessionViewConfig, height]);

  return {
    openDetailsPanel,
    shouldShowDetailsPanel,
    SessionView: sessionViewComponent,
    DetailsPanel,
  };
};
