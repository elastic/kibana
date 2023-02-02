/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { EntityType } from '@kbn/timelines-plugin/common';
import type { ExpandedDetailType } from '../../../../../common/types';
import { getScopedActions, isInTableScope, isTimelineScope } from '../../../../helpers';
import type { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import { timelineSelectors } from '../../../store/timeline';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import type { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { activeTimeline } from '../../../containers/active_timeline_context';
import { TimelineTabs, TimelineId } from '../../../../../common/types/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { DetailsPanel as DetailsPanelComponent } from '..';
import { dataTableSelectors } from '../../../../common/store/data_table';

export interface UseDetailPanelConfig {
  entityType?: EntityType;
  isFlyoutView?: boolean;
  sourcererScope: SourcererScopeName;
  scopeId: string;
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
  scopeId,
  tabType = TimelineTabs.query,
}: UseDetailPanelConfig): UseDetailPanelReturn => {
  const { browserFields, selectedPatterns, runtimeMappings } = useSourcererDataView(sourcererScope);
  const dispatch = useDispatch();
  const getScope = useMemo(() => {
    if (isTimelineScope(scopeId)) {
      return timelineSelectors.getTimelineByIdSelector();
    } else if (isInTableScope(scopeId)) {
      return dataTableSelectors.getTableByIdSelector();
    }
  }, [scopeId]);
  const eventDetailsIndex = useMemo(() => selectedPatterns.join(','), [selectedPatterns]);

  const expandedDetail = useDeepEqualSelector(
    (state) => ((getScope && getScope(state, scopeId)) ?? timelineDefaults)?.expandedDetail
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
  const scopedActions = getScopedActions(scopeId);

  // We could just surface load details panel, but rather than have users be concerned
  // of the config for a panel, they can just pass the base necessary values to a panel specific function
  const loadDetailsPanel = useCallback(
    (panelConfig?: ExpandedDetailType) => {
      if (panelConfig && scopedActions) {
        dispatch(
          scopedActions.toggleDetailPanel({
            ...panelConfig,
            tabType,
            id: scopeId,
          })
        );
      }
    },
    [scopedActions, scopeId, dispatch, tabType]
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
    if (scopedActions) {
      dispatch(scopedActions.toggleDetailPanel({ tabType, id: scopeId }));
    }

    if (
      tabType &&
      expandedDetail[tabType]?.panelView &&
      scopeId === TimelineId.active &&
      shouldShowDetailsPanel
    ) {
      activeTimeline.toggleExpandedDetail({});
    }
  }, [scopedActions, tabType, expandedDetail, scopeId, shouldShowDetailsPanel, dispatch]);

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
          scopeId={scopeId}
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
      scopeId,
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
