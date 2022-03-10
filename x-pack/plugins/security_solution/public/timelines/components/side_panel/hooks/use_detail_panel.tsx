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
import { DetailsPanel as DetailsPanelComponent } from '..';

export interface UseDetailPanelConfig {
  entityType?: EntityType;
  isFlyoutView?: boolean;
  sourcererScope: SourcererScopeName;
  timelineId: TimelineId;
  tabType?: TimelineTabs;
}

export interface UseDetailPanelReturn {
  openDetailsPanel: (eventId?: string, onClose?: () => void) => void;
  handleOnDetailsPanelClosed: () => void;
  DetailsPanel: JSX.Element | null;
  shouldShowDetailsPanel: boolean;
}

export const useDetailPanel = ({
  entityType,
  isFlyoutView,
  sourcererScope,
  timelineId,
  tabType,
}: UseDetailPanelConfig): UseDetailPanelReturn => {
  const { browserFields, docValueFields, selectedPatterns, runtimeMappings } =
    useSourcererDataView(sourcererScope);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const dispatch = useDispatch();

  const expandedDetail = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults)?.expandedDetail
  );
  const onPanelClose = useRef(() => {});

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
      onPanelClose.current = onClose ?? (() => {});
    },
    [loadDetailsPanel]
  );

  const handleOnDetailsPanelClosed = useCallback(() => {
    console.log('ON PANEL CLOSE: ', onPanelClose.current); // eslint-disable-line
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
          docValueFields={docValueFields}
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
      docValueFields,
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
    openDetailsPanel,
    handleOnDetailsPanelClosed,
    shouldShowDetailsPanel,
    DetailsPanel,
  };
};
