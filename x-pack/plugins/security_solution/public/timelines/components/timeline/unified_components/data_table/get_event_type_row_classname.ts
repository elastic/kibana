/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { getEventType, isEvenEqlSequence, isEventBuildingBlockType } from '../../body/helpers';

export const getEventTypeRowClassName = (ecsData: TimelineItem['ecs']) => {
  const eventType = getEventType(ecsData);
  const eventTypeClassName =
    eventType === 'raw'
      ? 'rawEvent'
      : eventType === 'eql'
      ? isEvenEqlSequence(ecsData)
        ? 'eqlSequence'
        : 'eqlNonSequence'
      : 'nonRawEvent';

  const buildingBlockTypeClassName = isEventBuildingBlockType(ecsData) ? 'buildingBlockType' : '';

  return `${eventTypeClassName} ${buildingBlockTypeClassName}`.trim();
};
