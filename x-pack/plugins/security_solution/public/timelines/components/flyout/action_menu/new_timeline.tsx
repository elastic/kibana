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

interface NewTimelineActionProps {
  timelineId: string;
}

export const NewTimelineAction = ({ timelineId }: NewTimelineActionProps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const togglePopover = useCallback(() => setPopover((prev) => !prev), []);

  const onActionBtnClick = useCallback(() => {
    togglePopover();
  }, [togglePopover]);

  const newTimelineActionbtn = useMemo(() => {
    return (
      <EuiButtonEmpty iconType="arrowDown" size="s" iconSide="right" onClick={onActionBtnClick}>
        {`New`}
      </EuiButtonEmpty>
    );
  }, [onActionBtnClick]);

  return (
    <EuiPopover
      button={newTimelineActionbtn}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelStyle={{
        padding: 0,
      }}
    >
      <EuiFlexGroup gutterSize="xs" direction="column" alignItems="flexStart">
        <EuiFlexItem>
          <NewTimeline timelineId={timelineId} title={'New Timeline'} />
        </EuiFlexItem>
        <EuiFlexItem>
          <NewTemplateTimeline timelineId={timelineId} title={'New Template Timeline'} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
