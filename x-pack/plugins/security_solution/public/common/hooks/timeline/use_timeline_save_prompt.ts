/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { AppLeaveHandler } from '@kbn/core-application-browser';
import { useHistory } from 'react-router-dom';
import { useShowTimelineForGivenPath } from '../../utils/timeline/use_show_timeline_for_path';
import type { TimelineId } from '../../../../common/types';
import { TimelineStatus, TimelineTabs } from '../../../../common/types';
import { useKibana } from '../../lib/kibana';
import { useDeepEqualSelector } from '../use_selector';
import { APP_ID, APP_PATH } from '../../../../common/constants';
import { getTimelineShowStatusByIdSelector } from '../../../timelines/components/flyout/selectors';
import { timelineActions } from '../../../timelines/store/timeline';
import {
  UNSAVED_TIMELINE_SAVE_PROMPT,
  UNSAVED_TIMELINE_SAVE_PROMPT_TITLE,
} from '../../translations';

// Issue with history.block
// https://github.com/elastic/kibana/issues/132597

export const useTimelineSavePrompt = (
  timelineId: TimelineId,
  onAppLeave: (handler: AppLeaveHandler) => void
) => {
  const dispatch = useDispatch();
  const { overlays, application } = useKibana().services;
  const getIsTimelineVisible = useShowTimelineForGivenPath();
  const history = useHistory();

  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { status: timelineStatus, updated } = useDeepEqualSelector((state) =>
    getTimelineShowStatus(state, timelineId)
  );

  const showSaveTimelineModal = useCallback(() => {
    dispatch(timelineActions.showTimeline({ id: timelineId, show: true }));
    dispatch(
      timelineActions.setActiveTabTimeline({
        id: timelineId,
        activeTab: TimelineTabs.query,
      })
    );
    dispatch(
      timelineActions.toggleModalSaveTimeline({
        id: timelineId,
        showModalSaveTimeline: true,
      })
    );
  }, [dispatch, timelineId]);

  useEffect(() => {
    const unblock = history.block((location) => {
      const relativePath = location.pathname.replace(APP_PATH, '');
      async function confirmSaveTimeline() {
        const confirmRes = await overlays?.openConfirm(UNSAVED_TIMELINE_SAVE_PROMPT, {
          title: UNSAVED_TIMELINE_SAVE_PROMPT_TITLE,
          'data-test-subj': 'appLeaveConfirmModal',
        });

        if (confirmRes) {
          unblock();

          application.navigateToUrl(location.pathname + location.hash + location.search, {
            state: location.state,
          });
        } else {
          showSaveTimelineModal();
        }
      }

      if (
        !getIsTimelineVisible(relativePath) &&
        timelineStatus === TimelineStatus.draft &&
        updated != null
      ) {
        confirmSaveTimeline();
      } else {
        return;
      }
      return false;
    });

    return () => {
      unblock();
    };
  }, [
    history,
    application,
    overlays,
    showSaveTimelineModal,
    getIsTimelineVisible,
    timelineStatus,
    updated,
  ]);

  useEffect(() => {
    onAppLeave((actions, nextAppId) => {
      // Confirm when the user has made any changes to a timeline
      if (
        !(nextAppId ?? '').includes(APP_ID) &&
        timelineStatus === TimelineStatus.draft &&
        updated != null
      ) {
        return actions.confirm(
          UNSAVED_TIMELINE_SAVE_PROMPT,
          UNSAVED_TIMELINE_SAVE_PROMPT_TITLE,
          showSaveTimelineModal
        );
      } else {
        return actions.default();
      }
    });

    return () => {
      // removing app leave handler for timeline when
      // components containing timeline unmounts
      onAppLeave((actions) => actions.default());
    };
  });
};
