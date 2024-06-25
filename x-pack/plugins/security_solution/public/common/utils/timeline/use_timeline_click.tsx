/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryTimelineById } from '../../../timelines/components/open_timeline/helpers';
import type { TimelineErrorCallback } from '../../../timelines/components/open_timeline/types';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

export const useTimelineClick = () => {
  const queryTimelineById = useQueryTimelineById();

  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  const handleTimelineClick = useCallback(
    (timelineId: string, onError: TimelineErrorCallback, graphEventId?: string) => {
      queryTimelineById({
        graphEventId,
        timelineId,
        onError,
        unifiedComponentsInTimelineEnabled,
      });
    },
    [queryTimelineById, unifiedComponentsInTimelineEnabled]
  );

  return handleTimelineClick;
};
