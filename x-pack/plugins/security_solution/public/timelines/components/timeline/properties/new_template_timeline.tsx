/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TimelineType } from '../../../../../common/types/timeline';

import { useKibana } from '../../../../common/lib/kibana';
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
  timelineId = 'timeline-1',
}) => {
  const uiCapabilities = useKibana().services.application.capabilities;
  const capabilitiesCanUserCRUD: boolean = !!uiCapabilities.siem.crud;

  const { getButton } = useCreateTimelineButton({
    timelineId,
    timelineType: TimelineType.template,
    closeGearMenu,
  });

  const button = getButton({ outline, title });

  return capabilitiesCanUserCRUD ? button : null;
};

export const NewTemplateTimeline = React.memo(NewTemplateTimelineComponent);
NewTemplateTimeline.displayName = 'NewTemplateTimeline';
