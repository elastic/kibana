/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React, { useMemo, useState, useCallback } from 'react';
import { NewTimeline } from '../../timeline/properties/helpers';
import { NewTemplateTimeline } from '../../timeline/properties/new_template_timeline';
import * as i18n from './translations';

const panelStyle = {
  padding: 0,
};

interface NewTimelineButtonProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the portal
   */
  timelineId: string;
}

/**
 * This component renders a button that opens a popover with the options to create a new timeline or a new timeline template
 */
export const NewTimelineButton = React.memo(({ timelineId }: NewTimelineButtonProps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const togglePopover = useCallback(() => setPopover((prev) => !prev), []);

  const newTimelineActionbtn = useMemo(() => {
    return (
      <EuiButtonEmpty
        iconType="arrowDown"
        size="s"
        iconSide="right"
        onClick={togglePopover}
        data-test-subj={'new-timeline-button'}
      >
        {i18n.NEW_TIMELINE_BTN}
      </EuiButtonEmpty>
    );
  }, [togglePopover]);

  return (
    <EuiPopover
      button={newTimelineActionbtn}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelStyle={panelStyle}
    >
      <EuiFlexGroup gutterSize="xs" direction="column" alignItems="flexStart">
        <EuiFlexItem>
          <NewTimeline timelineId={timelineId} title={i18n.NEW_TIMELINE} onClick={closePopover} />
        </EuiFlexItem>
        <EuiFlexItem>
          <NewTemplateTimeline
            timelineId={timelineId}
            title={i18n.NEW_TEMPLATE_TIMELINE}
            onClick={closePopover}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
});

NewTimelineButton.displayName = 'NewTimelineButton';
