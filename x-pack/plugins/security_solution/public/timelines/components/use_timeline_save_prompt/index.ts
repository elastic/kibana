/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { AppLeaveHandler } from '@kbn/core-application-browser';
import { useHistory } from 'react-router-dom';
import { TimelineId, TimelineStatus, TimelineTabs } from '../../../../common/types';
import { timelineActions } from '../../store/timeline';
import { useKibana } from '../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { getTimelineShowStatusByIdSelector } from '../flyout/selectors';
import { getLinksWithHiddenTimeline } from '../../../common/links';

// Issue with history.block
// https://github.com/elastic/kibana/issues/132597

export const useTimelineSavePrompt = (
  timelineId: TimelineId,
  onAppLeave: (handler: AppLeaveHandler) => void
) => {
  const dispatch = useDispatch();

  const linksWithoutTimelines = getLinksWithHiddenTimeline();

  const pathsWithoutTimelines = linksWithoutTimelines.map((link) => `/app/security${link.path}`);

  const { overlays, application } = useKibana().services;
  const history = useHistory();

  const prompt = i18n.translate('xpack.securitySolution.timeline.unsavedWorkMessage', {
    defaultMessage: 'Leave Timeline with unsaved work?',
  });

  const title = i18n.translate('xpack.securitySolution.timeline.unsavedWorkTitle', {
    defaultMessage: 'Unsaved changes',
  });

  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { status: timelineStatus, updated } = useDeepEqualSelector((state) =>
    getTimelineShowStatus(state, timelineId)
  );

  const showSaveTimelineModal = useCallback(() => {
    dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: true }));
    dispatch(
      timelineActions.setActiveTabTimeline({
        id: TimelineId.active,
        activeTab: TimelineTabs.query,
      })
    );
    dispatch(
      timelineActions.toggleModalSaveTimeline({
        id: TimelineId.active,
        showModalSaveTimeline: true,
      })
    );
  }, [dispatch]);

  useEffect(() => {
    const unblock = history.block((location) => {
      async function confirmSaveTimeline() {
        const confirmRes = await overlays?.openConfirm(prompt, {
          title,
          'data-test-subj': 'appLeaveConfirmModal',
        });

        if (confirmRes) {
          unblock();

          application.navigateToUrl(location.pathname + location.hash + location.search, {
            state: location.state,
          });
        }
        showSaveTimelineModal();
      }

      if (
        pathsWithoutTimelines.includes(location.pathname) &&
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
    prompt,
    title,
    timelineStatus,
    updated,
    pathsWithoutTimelines,
  ]);

  useEffect(() => {
    onAppLeave((actions, nextAppId) => {
      // Confirm when the user has made any changes to a timeline
      if (
        !(nextAppId ?? '').includes('securitySolution') &&
        timelineStatus === TimelineStatus.draft &&
        updated != null
      ) {
        return actions.confirm(prompt, title, showSaveTimelineModal);
      } else {
        return actions.default();
      }
    });
  });
};
