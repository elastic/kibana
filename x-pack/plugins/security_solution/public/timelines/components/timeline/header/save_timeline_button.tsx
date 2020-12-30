/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { pick } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { TimelineId } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';
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
    const getTimelineSaveModal = useMemo(() => getTimelineSaveModalByIdSelector(), []);
    const show = useDeepEqualSelector((state) => getTimelineSaveModal(state, timelineId));
    const [showSaveTimelineOverlay, setShowSaveTimelineOverlay] = useState<boolean>(false);

    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

    const { title, description } = useDeepEqualSelector((state) =>
      pick(['title', 'description'], getTimeline(state, timelineId) ?? timelineDefaults)
    );

    const [initialTitle, setInitialTitle] = useState(title);
    const [initialDescription, setInitialDescription] = useState(description);

    const updateInitialTitle = useCallback(
      (newTitle = '') => {
        setInitialTitle(newTitle);
      },
      [setInitialTitle]
    );

    const updateInitialDescription = useCallback(
      (newDescription = '') => {
        setInitialDescription(newDescription);
      },
      [setInitialDescription]
    );
    const closeSaveTimeline = useCallback(() => {
      setShowSaveTimelineOverlay(false);
      if (show) {
        dispatch(
          timelineActions.toggleModalSaveTimeline({
            id: TimelineId.active,
            showModalSaveTimeline: false,
          })
        );
      }

      dispatch(
        timelineActions.updateTitle({
          id: timelineId,
          title: initialTitle,
          disableAutoSave: true,
        })
      );

      dispatch(
        timelineActions.updateDescription({
          id: timelineId,
          description: initialDescription,
          disableAutoSave: true,
        })
      );
    }, [dispatch, setShowSaveTimelineOverlay, show, timelineId, initialTitle, initialDescription]);

    const openSaveTimeline = useCallback(() => {
      setShowSaveTimelineOverlay(true);
      updateInitialTitle(title);
      updateInitialDescription(description);
    }, [description, title, updateInitialDescription, updateInitialTitle]);

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
          data-test-subj="save-timeline-modal-comp"
          closeSaveTimeline={closeSaveTimeline}
          initialFocus={initialFocus}
          openSaveTimeline={openSaveTimeline}
          timelineId={timelineId}
          showWarning={initialFocus === 'title' && show}
          updateInitialTitle={updateInitialTitle}
          updateInitialDescription={updateInitialDescription}
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
