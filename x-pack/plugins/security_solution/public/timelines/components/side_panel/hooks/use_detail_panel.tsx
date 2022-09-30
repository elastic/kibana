/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { EntityType } from '@kbn/timelines-plugin/common';
import type { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import type { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { activeTimeline } from '../../../containers/active_timeline_context';
import type { TimelineExpandedDetailType } from '../../../../../common/types/timeline';
import { TimelineTabs, TimelineId } from '../../../../../common/types/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { DetailsPanel as DetailsPanelComponent } from '..';

export interface UseDetailPanelConfig {
  entityType?: EntityType;
  isFlyoutView?: boolean;
  sourcererScope: SourcererScopeName;
  timelineId: TimelineId;
  tabType?: TimelineTabs;
}

export interface UseDetailPanelReturn {
  openEventDetailsPanel: (eventId?: string, onClose?: () => void) => void;
  openHostDetailsPanel: (hostName: string, onClose?: () => void) => void;
  openNetworkDetailsPanel: (
    ip: string,
    flowTarget: FlowTargetSourceDest,
    onClose?: () => void
  ) => void;
  openUserDetailsPanel: (userName: string, onClose?: () => void) => void;
  handleOnDetailsPanelClosed: () => void;
  DetailsPanel: JSX.Element | null;
  shouldShowDetailsPanel: boolean;
}

export const useDetailPanel = ({
  entityType,
  isFlyoutView,
  sourcererScope,
  timelineId,
  tabType = TimelineTabs.query,
}: UseDetailPanelConfig): UseDetailPanelReturn => {
  const { browserFields, selectedPatterns, runtimeMappings } = useSourcererDataView(sourcererScope);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const dispatch = useDispatch();
  const eventDetailsIndex = useMemo(() => selectedPatterns.join(','), [selectedPatterns]);

  const expandedDetail = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults)?.expandedDetail
  );
  const onPanelClose = useRef(() => {});
  const noopPanelClose = () => {};

  const shouldShowDetailsPanel = useMemo(() => {
    if (
      tabType &&
      expandedDetail &&
      expandedDetail[tabType] &&
      !!expandedDetail[tabType]?.panelView
    ) {
      return true;
    }
    return false;
  }, [expandedDetail, tabType]);

  // We could just surface load details panel, but rather than have users be concerned
  // of the config for a panel, they can just pass the base necessary values to a panel specific function
  const loadDetailsPanel = useCallback(
    (panelConfig?: TimelineExpandedDetailType) => {
      if (panelConfig) {
        dispatch(
          timelineActions.toggleDetailPanel({
            ...panelConfig,
            tabType,
            timelineId,
          })
        );
      }
    },
    [dispatch, tabType, timelineId]
  );

  const openEventDetailsPanel = useCallback(
    (eventId?: string, onClose?: () => void) => {
      if (eventId) {
        loadDetailsPanel({
          panelView: 'eventDetail',
          params: { eventId, indexName: eventDetailsIndex },
        });
      }
      onPanelClose.current = onClose ?? noopPanelClose;
    },
    [loadDetailsPanel, eventDetailsIndex]
  );

  const openHostDetailsPanel = useCallback(
    (hostName: string, onClose?: () => void) => {
      loadDetailsPanel({ panelView: 'hostDetail', params: { hostName } });
      onPanelClose.current = onClose ?? noopPanelClose;
    },
    [loadDetailsPanel]
  );

  const openNetworkDetailsPanel = useCallback(
    (ip: string, flowTarget: FlowTargetSourceDest, onClose?: () => void) => {
      loadDetailsPanel({ panelView: 'networkDetail', params: { ip, flowTarget } });
      onPanelClose.current = onClose ?? noopPanelClose;
    },
    [loadDetailsPanel]
  );

  const openUserDetailsPanel = useCallback(
    (userName: string, onClose?: () => void) => {
      loadDetailsPanel({ panelView: 'userDetail', params: { userName } });
      onPanelClose.current = onClose ?? noopPanelClose;
    },
    [loadDetailsPanel]
  );

  const handleOnDetailsPanelClosed = useCallback(() => {
    if (onPanelClose.current) onPanelClose.current();
    dispatch(timelineActions.toggleDetailPanel({ tabType, timelineId }));

    if (
      tabType &&
      expandedDetail[tabType]?.panelView &&
      timelineId === TimelineId.active &&
      shouldShowDetailsPanel
    ) {
      activeTimeline.toggleExpandedDetail({});
    }
  }, [dispatch, timelineId, expandedDetail, tabType, shouldShowDetailsPanel]);

  const DetailsPanel = useMemo(
    () =>
      shouldShowDetailsPanel ? (
        <DetailsPanelComponent
          browserFields={browserFields}
          entityType={entityType}
          handleOnPanelClosed={handleOnDetailsPanelClosed}
          isFlyoutView={isFlyoutView}
          runtimeMappings={runtimeMappings}
          tabType={tabType}
          timelineId={timelineId}
        />
      ) : null,
    [
      browserFields,
      entityType,
      handleOnDetailsPanelClosed,
      isFlyoutView,
      runtimeMappings,
      shouldShowDetailsPanel,
      tabType,
      timelineId,
    ]
  );

  return {
    openEventDetailsPanel,
    openHostDetailsPanel,
    openNetworkDetailsPanel,
    openUserDetailsPanel,
    handleOnDetailsPanelClosed,
    shouldShowDetailsPanel,
    DetailsPanel,
  };
};
