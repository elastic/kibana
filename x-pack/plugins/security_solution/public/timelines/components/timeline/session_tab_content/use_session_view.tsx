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
import { useDispatch } from 'react-redux';
import {
  isInTableScope,
  isTimelineScope,
} from '../../../../common/components/event_details/helpers';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import type { TableId } from '../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
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
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { dataTableActions, dataTableSelectors } from '../../../../common/store/data_table';
import { tableDefaults } from '../../../../common/store/data_table/defaults';

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
  activeTab,
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
                  isInTimeline,
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

export const useSessionViewNavigation = ({ scopeId }: { scopeId: string }) => {
  const dispatch = useDispatch();
  const getScope = useMemo(() => {
    if (isTimelineScope(scopeId)) {
      return timelineSelectors.getTimelineByIdSelector();
    } else if (isInTableScope(scopeId)) {
      return dataTableSelectors.getTableByIdSelector();
    }
  }, [scopeId]);
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();

  const defaults = isTimelineScope(scopeId) ? timelineDefaults : tableDefaults;
  const { graphEventId, sessionViewConfig, activeTab, prevActiveTab } = useDeepEqualSelector(
    (state) => ({
      activeTab: timelineDefaults.activeTab,
      prevActiveTab: timelineDefaults.prevActiveTab,
      ...((getScope && getScope(state, scopeId)) ?? defaults),
    })
  );

  const isInTimeline = scopeId === TimelineId.active;
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
      if (isTimelineScope(scopeId)) {
        dispatch(timelineActions.updateTimelineGraphEventId({ id: scopeId, graphEventId: '' }));
        dispatch(
          timelineActions.updateTimelineSessionViewConfig({ id: scopeId, sessionViewConfig: null })
        );
      } else if (isInTableScope(scopeId)) {
        dispatch(dataTableActions.updateTableGraphEventId({ id: scopeId, graphEventId: '' }));
        dispatch(
          dataTableActions.updateTableSessionViewConfig({ id: scopeId, sessionViewConfig: null })
        );
      }
    } else {
      if (activeTab === TimelineTabs.graph) {
        if (isTimelineScope(scopeId)) {
          dispatch(timelineActions.updateTimelineGraphEventId({ id: scopeId, graphEventId: '' }));
          if (prevActiveTab === TimelineTabs.session && !sessionViewConfig) {
            dispatch(
              timelineActions.setActiveTabTimeline({ id: scopeId, activeTab: TimelineTabs.query })
            );
          }
        } else if (isInTableScope(scopeId)) {
          dispatch(dataTableActions.updateTableGraphEventId({ id: scopeId, graphEventId: '' }));
        }
      } else if (activeTab === TimelineTabs.session) {
        if (isTimelineScope(scopeId)) {
          dispatch(
            timelineActions.updateTimelineSessionViewConfig({
              id: scopeId,
              sessionViewConfig: null,
            })
          );
          if (prevActiveTab === TimelineTabs.graph && !graphEventId) {
            dispatch(
              timelineActions.setActiveTabTimeline({ id: scopeId, activeTab: TimelineTabs.query })
            );
          } else {
            dispatch(
              timelineActions.setActiveTabTimeline({ id: scopeId, activeTab: prevActiveTab })
            );
          }
        } else if (isInTableScope(scopeId)) {
          dispatch(
            dataTableActions.updateTableSessionViewConfig({
              id: scopeId,
              sessionViewConfig: null,
            })
          );
        }
      }
    }
  }, [
    isInTimeline,
    setTimelineFullScreen,
    setGlobalFullScreen,
    dispatch,
    scopeId,
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
}: {
  scopeId: string;
  entityType?: EntityType;
  height?: number;
}) => {
  const { sessionView } = useKibana().services;
  const getScope = useMemo(() => {
    if (isTimelineScope(scopeId)) {
      return timelineSelectors.getTimelineByIdSelector();
    } else if (isInTableScope(scopeId)) {
      return dataTableSelectors.getTableByIdSelector();
    }
  }, [scopeId]);
  const { globalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen } = useTimelineFullScreen();

  const defaults = isTimelineScope(scopeId) ? timelineDefaults : tableDefaults;
  const { sessionViewConfig, activeTab } = useDeepEqualSelector((state) => ({
    activeTab: timelineDefaults.activeTab,
    prevActiveTab: timelineDefaults.prevActiveTab,
    ...((getScope && getScope(state, scopeId)) ?? defaults),
  }));

  const isInTimeline = scopeId === TimelineId.active;

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
    tabType: isInTimeline ? activeTab : TimelineTabs.query,
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
