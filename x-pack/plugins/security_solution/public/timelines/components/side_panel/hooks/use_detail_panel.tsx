/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { EntityType } from '@kbn/timelines-plugin/common';
import { getScopedActions, isInTableScope, isTimelineScope } from '../../../../helpers';
import { timelineSelectors } from '../../../store/timeline';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import type { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { activeTimeline } from '../../../containers/active_timeline_context';
import type { TimelineTabs } from '../../../../../common/types/timeline';
import { TimelineId } from '../../../../../common/types/timeline';
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
  openDetailsPanel: (eventId?: string, onClose?: () => void) => void;
  handleOnDetailsPanelClosed: () => void;
  DetailsPanel: JSX.Element | null;
  shouldShowDetailsPanel: boolean;
}

export const useDetailPanel = ({
  entityType,
  isFlyoutView,
  sourcererScope,
  scopeId,
  tabType,
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

  const expandedDetail = useDeepEqualSelector(
    (state) => ((getScope && getScope(state, scopeId)) ?? timelineDefaults)?.expandedDetail
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
  const scopedActions = getScopedActions(scopeId);
  const loadDetailsPanel = useCallback(
    (eventId?: string) => {
      if (eventId && scopedActions) {
        if (isTimelineScope(scopeId)) {
          dispatch(
            scopedActions.toggleDetailPanel({
              panelView: 'eventDetail',
              tabType,
              id: scopeId,
              params: {
                eventId,
                indexName: selectedPatterns.join(','),
              },
            })
          );
        }
      }
    },
    [scopedActions, scopeId, dispatch, tabType, selectedPatterns]
  );

  const openDetailsPanel = useCallback(
    (eventId?: string, onClose?: () => void) => {
      loadDetailsPanel(eventId);
      onPanelClose.current = onClose ?? (() => {});
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
    openDetailsPanel,
    handleOnDetailsPanelClosed,
    shouldShowDetailsPanel,
    DetailsPanel,
  };
};
