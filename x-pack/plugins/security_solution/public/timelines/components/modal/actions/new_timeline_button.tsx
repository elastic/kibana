/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useMemo, useState, useCallback } from 'react';
import { useCreateTimeline } from '../../../hooks/use_create_timeline';
import { TimelineType } from '../../../../../common/api/timeline';
import * as i18n from './translations';

interface NewTimelineButtonProps {
  /**
   * Id of the timeline
   */
  timelineId: string;
}

/**
 * Button that opens a popover with options to create a new timeline or a new timeline template
 */
export const NewTimelineButton = React.memo(({ timelineId }: NewTimelineButtonProps) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const togglePopover = useCallback(() => setPopover((prev) => !prev), []);

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

  const button = useMemo(() => {
    return (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        data-test-subj={'timeline-modal-new-timeline-dropdown-button'}
        onClick={togglePopover}
      >
        {i18n.NEW_TIMELINE_BTN}
      </EuiButtonEmpty>
    );
  }, [togglePopover]);

  const handleCreateNewTimeline = useCallback(async () => {
    await createNewTimeline();
  }, [createNewTimeline]);

  const handleCreateNewTimelineTemplate = useCallback(async () => {
    await createNewTimelineTemplate();
  }, [createNewTimelineTemplate]);

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        key="new-timeline"
        icon="plusInCircle"
        data-test-subj={'timeline-modal-new-timeline'}
        onClick={handleCreateNewTimeline}
      >
        {i18n.NEW_TIMELINE}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="new-timeline-template"
        icon="plusInCircle"
        data-test-subj={'timeline-modal-new-timeline-template'}
        onClick={handleCreateNewTimelineTemplate}
      >
        {i18n.NEW_TEMPLATE_TIMELINE}
      </EuiContextMenuItem>,
    ],
    [handleCreateNewTimeline, handleCreateNewTimelineTemplate]
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={togglePopover}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
});

NewTimelineButton.displayName = 'NewTimelineButton';
