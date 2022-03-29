/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { timelineSelectors } from '../../../store/timeline';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useDetailPanel } from '../../side_panel/hooks/use_detail_panel';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { SCROLLING_DISABLED_CLASS_NAME } from '../../../../../common/constants';
import {
  useTimelineFullScreen,
  useGlobalFullScreen,
} from '../../../../common/containers/use_full_screen';
import {
  updateTimelineGraphEventId,
  updateTimelineSessionViewSessionId,
} from '../../../../timelines/store/timeline/actions';

export const useSessionView = ({ timelineId }: { timelineId: TimelineId }) => {
  const { sessionView } = useKibana().services;
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const sessionViewId = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).sessionViewId
  );

  const { setGlobalFullScreen } = useGlobalFullScreen();

  const { setTimelineFullScreen } = useTimelineFullScreen();
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
    dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: '' }));
    dispatch(updateTimelineSessionViewSessionId({ id: timelineId, eventId: null }));
  }, [dispatch, timelineId, setTimelineFullScreen, setGlobalFullScreen]);
  const { openDetailsPanel, shouldShowDetailsPanel, DetailsPanel } = useDetailPanel({
    sourcererScope: SourcererScopeName.timeline,
    timelineId,
    tabType: TimelineTabs.session,
  });
  const sessionViewComponent = useMemo(() => {
    return sessionViewId !== null
      ? sessionView.getSessionView({
          sessionEntityId: sessionViewId,
          loadAlertDetails: openDetailsPanel,
        })
      : null;
  }, [openDetailsPanel, sessionView, sessionViewId]);

  return {
    onCloseOverlay,
    shouldShowDetailsPanel,
    SessionView: sessionViewComponent,
    DetailsPanel,
  };
};
