/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback } from 'react';
import { TimelineTabs } from '@kbn/securitysolution-data-table';
import { useDispatch } from 'react-redux';
import { useLicense } from '../../../common/hooks/use_license';
import { SessionPreview } from './session_preview';
import { useSessionPreview } from '../hooks/use_session_preview';
import { useInvestigateInTimeline } from '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useRightPanelContext } from '../context';
import { ALERTS_ACTIONS } from '../../../common/lib/apm/user_actions';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { SESSION_PREVIEW_TEST_ID } from './test_ids';
import {
  SESSION_PREVIEW_ERROR,
  SESSION_PREVIEW_TITLE,
  SESSION_PREVIEW_UPSELL,
} from './translations';
import { useStartTransaction } from '../../../common/lib/apm/use_start_transaction';
import { setActiveTabTimeline } from '../../../timelines/store/timeline/actions';
import { getScopedActions } from '../../../helpers';

const timelineId = 'timeline-1';

/**
 * Checks if the SessionView component is available, if so render it or else render an error message
 */
export const SessionPreviewContainer: FC = () => {
  const { dataAsNestedObject, getFieldsData } = useRightPanelContext();

  // decide whether to show the session view or not
  const sessionViewConfig = useSessionPreview({ getFieldsData });
  const isEnterprisePlus = useLicense().isEnterprise();
  const isEnabled = sessionViewConfig && isEnterprisePlus;

  const dispatch = useDispatch();
  const { startTransaction } = useStartTransaction();
  const scopedActions = getScopedActions(timelineId);
  const { investigateInTimelineAlertClick } = useInvestigateInTimeline({
    ecsRowData: dataAsNestedObject,
  });

  const goToSessionViewTab = useCallback(() => {
    // open timeline
    investigateInTimelineAlertClick();

    // open session view tab
    startTransaction({ name: ALERTS_ACTIONS.OPEN_SESSION_VIEW });
    if (sessionViewConfig !== null) {
      dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.session }));
      if (scopedActions) {
        dispatch(scopedActions.updateSessionViewConfig({ id: timelineId, sessionViewConfig }));
      }
    }
  }, [
    dispatch,
    investigateInTimelineAlertClick,
    scopedActions,
    sessionViewConfig,
    startTransaction,
  ]);

  const noSessionMessage = !isEnterprisePlus ? (
    <div data-test-subj={`${SESSION_PREVIEW_TEST_ID}UpSell`}>{SESSION_PREVIEW_UPSELL}</div>
  ) : !sessionViewConfig ? (
    <div data-test-subj={`${SESSION_PREVIEW_TEST_ID}Error`}>{SESSION_PREVIEW_ERROR}</div>
  ) : null;

  return (
    <ExpandablePanel
      header={{
        title: SESSION_PREVIEW_TITLE,
        iconType: 'timeline',
        ...(isEnabled && { callback: goToSessionViewTab }),
      }}
      data-test-subj={SESSION_PREVIEW_TEST_ID}
    >
      {isEnabled ? <SessionPreview /> : noSessionMessage}
    </ExpandablePanel>
  );
};
