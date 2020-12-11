/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { TimelineId } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { timelineActions } from '../../../store/timeline';
import { getTimelineSaveModalByIdSelector } from './selectors';
import { TimelineTitleAndDescription } from './title_and_description';
import { EDIT } from './translations';

export interface SaveTimelineComponentProps {
  initialFocus: 'title' | 'description';
  timelineId: string;
  toolTip?: string;
}

export const SaveTimelineButton = React.memo<SaveTimelineComponentProps>(
  ({ initialFocus, timelineId, toolTip }) => {
    const dispatch = useDispatch();
    const { navigateToApp } = useKibana().services.application;
    const getTimelineSaveModal = useMemo(() => getTimelineSaveModalByIdSelector(), []);
    const { show, nextAppId } = useDeepEqualSelector((state) =>
      getTimelineSaveModal(state, timelineId)
    );
    const [showSaveTimelineOverlay, setShowSaveTimelineOverlay] = useState<boolean>(false);
    const closeSaveTimeline = useCallback(() => {
      setShowSaveTimelineOverlay(false);
      if (show) {
        dispatch(
          timelineActions.toggleModalSaveTimeline({
            id: TimelineId.active,
            showModalSaveTimeline: false,
            nextAppId: undefined,
          })
        );
      }
      if (nextAppId) {
        // We need to do that to allow the reducer to update
        // to avoid to ask again if the user want to save the timeline again
        setTimeout(() => navigateToApp(nextAppId), 0);
      }
    }, [dispatch, navigateToApp, nextAppId, setShowSaveTimelineOverlay, show]);

    const openSaveTimeline = useCallback(() => {
      setShowSaveTimelineOverlay(true);
    }, [setShowSaveTimelineOverlay]);

    const saveTimelineButtonIcon = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={EDIT}
          onClick={openSaveTimeline}
          iconType="pencil"
          data-test-subj="save-timeline-button-icon"
        />
      ),
      [openSaveTimeline]
    );

    return (initialFocus === 'title' && show) || showSaveTimelineOverlay ? (
      <>
        {saveTimelineButtonIcon}
        <TimelineTitleAndDescription
          closeSaveTimeline={closeSaveTimeline}
          initialFocus={initialFocus}
          openSaveTimeline={openSaveTimeline}
          timelineId={timelineId}
          showWarning={initialFocus === 'title' && show}
        />
      </>
    ) : (
      <EuiToolTip content={toolTip ?? ''} data-test-subj="save-timeline-btn-tooltip">
        {saveTimelineButtonIcon}
      </EuiToolTip>
    );
  }
);

SaveTimelineButton.displayName = 'SaveTimelineButton';
