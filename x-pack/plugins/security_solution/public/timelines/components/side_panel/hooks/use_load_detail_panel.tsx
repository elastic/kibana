/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import type { EntityType } from '../../../../../../timelines/common';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { activeTimeline } from '../../../containers/active_timeline_context';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { DetailsPanel } from '..';

interface UseLoadDetailPanelConfig {
  entityType?: EntityType;
  isFlyoutView?: boolean;
  sourcerScope: SourcererScopeName;
  timelineId: TimelineId;
  tabType?: TimelineTabs;
}

interface UseLoadDetailPanelReturn {
  openDetailsPanel: (eventId?: string, onClose?: () => void) => void;
  handleOnDetailsPanelClosed: () => void;
  FlyoutDetailsPanel: JSX.Element;
  shouldShowFlyoutDetailsPanel: boolean;
}

export const useLoadDetailPanel = ({
  entityType,
  isFlyoutView,
  sourcerScope,
  timelineId,
  tabType,
}: UseLoadDetailPanelConfig): UseLoadDetailPanelReturn => {
  const { browserFields, docValueFields, selectedPatterns, runtimeMappings } =
    useSourcererDataView(sourcerScope);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const dispatch = useDispatch();

  const expandedDetail = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).expandedDetail
  );
  const onFlyoutClose = useRef(() => {});

  const shouldShowFlyoutDetailsPanel = useMemo(() => {
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

  const loadDetailsPanel = useCallback(
    (eventId?: string) => {
      if (eventId) {
        dispatch(
          timelineActions.toggleDetailPanel({
            panelView: 'eventDetail',
            tabType,
            timelineId,
            params: {
              eventId,
              indexName: selectedPatterns.join(','),
            },
          })
        );
      }
    },
    [dispatch, selectedPatterns, tabType, timelineId]
  );

  const openDetailsPanel = useCallback(
    (eventId?: string, onClose?: () => void) => {
      loadDetailsPanel(eventId);
      onFlyoutClose.current = onClose ?? (() => {});
    },
    [loadDetailsPanel]
  );

  const handleOnDetailsPanelClosed = useCallback(() => {
    if (onFlyoutClose.current) onFlyoutClose.current();
    dispatch(timelineActions.toggleDetailPanel({ tabType, timelineId }));

    if (
      tabType &&
      expandedDetail[tabType]?.panelView &&
      timelineId === TimelineId.active &&
      shouldShowFlyoutDetailsPanel
    ) {
      activeTimeline.toggleExpandedDetail({});
    }
  }, [dispatch, timelineId, expandedDetail, tabType, shouldShowFlyoutDetailsPanel]);

  const FlyoutDetailsPanel = useMemo(
    () => (
      <DetailsPanel
        browserFields={browserFields}
        docValueFields={docValueFields}
        entityType={entityType}
        handleOnPanelClosed={handleOnDetailsPanelClosed}
        isFlyoutView={isFlyoutView}
        runtimeMappings={runtimeMappings}
        tabType={tabType}
        timelineId={timelineId}
      />
    ),
    [
      browserFields,
      docValueFields,
      entityType,
      handleOnDetailsPanelClosed,
      isFlyoutView,
      runtimeMappings,
      tabType,
      timelineId,
    ]
  );

  return {
    openDetailsPanel,
    handleOnDetailsPanelClosed,
    shouldShowFlyoutDetailsPanel,
    FlyoutDetailsPanel,
  };
};
