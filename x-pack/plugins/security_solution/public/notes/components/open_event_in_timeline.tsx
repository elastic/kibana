/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiLink } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useInvestigateInTimeline } from '../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import * as i18n from './translations';

export const OpenEventInTimeline: React.FC<{ eventId?: string | null }> = memo(({ eventId }) => {
  const ecsRowData = { event: { id: [eventId] }, _id: eventId } as Ecs;
  const { investigateInTimelineAlertClick } = useInvestigateInTimeline({ ecsRowData });

  return (
    <EuiLink onClick={investigateInTimelineAlertClick} data-test-subj="open-event-in-timeline">
      {i18n.VIEW_EVENT_IN_TIMELINE}
    </EuiLink>
  );
});

OpenEventInTimeline.displayName = 'OpenEventInTimeline';
