/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { TimelineTabs } from '@kbn/securitysolution-data-table';
import { useStartTransaction } from '../../../common/lib/apm/use_start_transaction';
import { useInvestigateInTimeline } from '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { ALERTS_ACTIONS } from '../../../common/lib/apm/user_actions';
import { getScopedActions } from '../../../helpers';
import { setActiveTabTimeline } from '../../../timelines/store/timeline/actions';
import { useRightPanelContext } from '../context';
import { isInvestigateInResolverActionEnabled } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { ANALYZER_PREVIEW_ERROR, ANALYZER_PREVIEW_TITLE } from './translations';
import { ExpandablePanel } from '../../shared/components/expandable_panel';

const timelineId = 'timeline-1';

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreviewContainer: React.FC = () => {
  const { dataAsNestedObject } = useRightPanelContext();

  // decide whether to show the session view or not
  const isEnabled = isInvestigateInResolverActionEnabled(dataAsNestedObject || undefined);

  const dispatch = useDispatch();
  const { startTransaction } = useStartTransaction();
  const { investigateInTimelineAlertClick } = useInvestigateInTimeline({
    ecsRowData: dataAsNestedObject,
  });

  // open timeline to the analyzer tab because the expandable flyout left panel Visualize => Analyzer tab is not ready
  const goToAnalyserTab = useCallback(() => {
    // open timeline
    investigateInTimelineAlertClick();

    // open analyzer tab
    startTransaction({ name: ALERTS_ACTIONS.OPEN_ANALYZER });
    const scopedActions = getScopedActions(timelineId);
    if (scopedActions && dataAsNestedObject) {
      dispatch(
        scopedActions.updateGraphEventId({ id: timelineId, graphEventId: dataAsNestedObject._id })
      );
    }
    dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph }));
  }, [dataAsNestedObject, dispatch, investigateInTimelineAlertClick, startTransaction]);

  return (
    <ExpandablePanel
      header={{
        title: ANALYZER_PREVIEW_TITLE,
        iconType: 'timeline',
        ...(isEnabled && { callback: goToAnalyserTab }),
      }}
      data-test-subj={ANALYZER_PREVIEW_TEST_ID}
    >
      {isEnabled ? (
        <AnalyzerPreview />
      ) : (
        <div data-test-subj={`${ANALYZER_PREVIEW_TEST_ID}Error`}>{ANALYZER_PREVIEW_ERROR}</div>
      )}
    </ExpandablePanel>
  );
};

AnalyzerPreviewContainer.displayName = 'AnalyzerPreviewContainer';
