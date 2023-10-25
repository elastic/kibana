/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { useEditTimelineOperation } from '../../timeline/header/edit_timeline_button';

interface SaveTimelineActionProps {
  timelineId: string;
}

export const SaveTimelineAction = ({ timelineId }: SaveTimelineActionProps) => {
  const { openEditTimeline, editTimelineModal } = useEditTimelineOperation({
    timelineId,
  });
  return (
    <>
      {editTimelineModal}
      <EuiButton fill size="s" onClick={openEditTimeline} iconType="save">
        {'Save'}
      </EuiButton>
    </>
  );
};
