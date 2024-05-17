/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { useMemo } from 'react';
import { getEventType, isEvenEqlSequence, isEventBuildingBlockType } from '../../body/helpers';

export const useGetEventTypeRowClassName = (ecsData: TimelineItem['ecs']) => {
  const eventType = useMemo(() => getEventType(ecsData), [ecsData]);
  const eventTypeClassName = useMemo(
    () =>
      eventType === 'raw'
        ? 'rawEvent'
        : eventType === 'eql'
          ? isEvenEqlSequence(ecsData)
            ? 'eqlSequence'
            : 'eqlNonSequence'
          : 'nonRawEvent',
    [ecsData, eventType]
  );
  const buildingBlockTypeClassName = useMemo(
    () => (isEventBuildingBlockType(ecsData) ? 'buildingBlockType' : ''),
    [ecsData]
  );

  return useMemo(
    () => `${eventTypeClassName} ${buildingBlockTypeClassName}`.trim(),
    [eventTypeClassName, buildingBlockTypeClassName]
  );
};
