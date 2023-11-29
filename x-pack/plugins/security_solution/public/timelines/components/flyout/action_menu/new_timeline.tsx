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

interface NewTimelineActionProps {
  timelineId: string;
}

const panelStyle = {
  padding: 0,
};

export const NewTimelineAction = React.memo(({ timelineId }: NewTimelineActionProps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const togglePopover = useCallback(() => setPopover((prev) => !prev), []);

  const newTimelineActionbtn = useMemo(() => {
    return (
      <EuiButtonEmpty iconType="arrowDown" size="s" iconSide="right" onClick={togglePopover}>
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

NewTimelineAction.displayName = 'NewTimelineAction';
