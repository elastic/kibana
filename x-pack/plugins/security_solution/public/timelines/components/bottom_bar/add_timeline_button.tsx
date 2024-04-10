/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import * as i18n from './translations';
import { useCreateTimeline } from '../../hooks/use_create_timeline';
import { TimelineType } from '../../../../common/api/timeline';
import { OpenTimelineModal } from '../open_timeline/open_timeline_modal';
import type { ActionTimelineToShow } from '../open_timeline/types';

const actionTimelineToHide: ActionTimelineToShow[] = ['createFrom'];

interface AddTimelineButtonComponentProps {
  /**
   * Id of the timeline
   */
  timelineId: string;
}

/**
 * Plus button that opens a popover with options to create a new timeline, a new timeline template or open an existing timeline.
 * The component is used in the timeline bottom_bar.
 */
export const AddTimelineButton = React.memo<AddTimelineButtonComponentProps>(({ timelineId }) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  const togglePopover = useCallback(() => setPopover(!isPopoverOpen), [isPopoverOpen]);
  const closeTimelineModal = useCallback(() => setShowTimelineModal(false), []);
  const openTimelineModal = useCallback(() => {
    togglePopover();
    setShowTimelineModal(true);
  }, [togglePopover]);

  const createNewTimeline = useCreateTimeline({
    timelineId,
    timelineType: TimelineType.default,
    onClick: togglePopover,
  });
  const createNewTimelineTemplate = useCreateTimeline({
    timelineId,
    timelineType: TimelineType.template,
    onClick: togglePopover,
  });

  const handleCreateNewTimeline = useCallback(async () => {
    await createNewTimeline();
  }, [createNewTimeline]);

  const handleCreateNewTimelineTemplate = useCallback(async () => {
    await createNewTimelineTemplate();
  }, [createNewTimelineTemplate]);

  const plusButton = useMemo(
    () => (
      <EuiButtonIcon
        iconType="plusInCircle"
        iconSize="m"
        color="primary"
        data-test-subj="timeline-bottom-bar-open-button"
        aria-label={i18n.ADD_TIMELINE}
        onClick={togglePopover}
      />
    ),
    [togglePopover]
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={plusButton}
          isOpen={isPopoverOpen}
          closePopover={() => setPopover}
          repositionOnScroll
        >
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="plusInCircle"
                color="text"
                data-test-subj="timeline-bottom-bar-create-new-timeline"
                onClick={handleCreateNewTimeline}
              >
                {i18n.NEW_TIMELINE}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="plusInCircle"
                color="text"
                data-test-subj="timeline-bottom-bar-create-new-timeline-template"
                onClick={handleCreateNewTimelineTemplate}
              >
                {i18n.NEW_TEMPLATE_TIMELINE}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="folderOpen"
                color="text"
                data-test-subj="timeline-bottom-bar-open-timeline"
                onClick={openTimelineModal}
              >
                {i18n.OPEN_TIMELINE}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopover>
      </EuiFlexItem>

      {showTimelineModal ? (
        <OpenTimelineModal onClose={closeTimelineModal} hideActions={actionTimelineToHide} />
      ) : null}
    </>
  );
});

AddTimelineButton.displayName = 'AddTimelineButton';
