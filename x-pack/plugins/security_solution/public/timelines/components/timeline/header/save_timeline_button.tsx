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

    const [currentTitle, setCurrentTitle] = useState(title);
    const [currentDescription, setCurrentDescription] = useState(description);

    const updateCurrentTitle = useCallback(
      (newTitle = '') => {
        setCurrentTitle(newTitle);
      },
      [setCurrentTitle]
    );

    const updateCurrentDescription = useCallback(
      (newDescription = '') => {
        setCurrentDescription(newDescription);
      },
      [setCurrentDescription]
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
    }, [dispatch, setShowSaveTimelineOverlay, show]);

    const openSaveTimeline = useCallback(() => {
      setShowSaveTimelineOverlay(true);
      updateCurrentTitle(title);
      updateCurrentDescription(description);
    }, [description, title, updateCurrentDescription, updateCurrentTitle]);

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
          currentTitle={currentTitle}
          currentDescription={currentDescription}
          closeSaveTimeline={closeSaveTimeline}
          data-test-subj="save-timeline-modal-comp"
          initialFocus={initialFocus}
          showWarning={initialFocus === 'title' && show}
          timelineId={timelineId}
          updateCurrentTitle={updateCurrentTitle}
          updateCurrentDescription={updateCurrentDescription}
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
