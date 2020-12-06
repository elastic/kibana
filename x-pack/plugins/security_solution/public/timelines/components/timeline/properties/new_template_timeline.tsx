/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TimelineId, TimelineType } from '../../../../../common/types/timeline';

import { useCreateTimelineButton } from './use_create_timeline';

interface OwnProps {
  closeGearMenu?: () => void;
  outline?: boolean;
  title?: string;
  timelineId?: string;
}

export const NewTemplateTimelineComponent: React.FC<OwnProps> = ({
  closeGearMenu,
  outline,
  title,
  timelineId = TimelineId.active,
}) => {
  const { getButton } = useCreateTimelineButton({
    timelineId,
    timelineType: TimelineType.template,
    closeGearMenu,
  });

  const button = getButton({ outline, title });

  return button;
};

export const NewTemplateTimeline = React.memo(NewTemplateTimelineComponent);
NewTemplateTimeline.displayName = 'NewTemplateTimeline';
