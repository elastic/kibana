/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isEmpty, pick } from 'lodash/fp';
import { TimelineType } from '../../../common/api/timeline';
import {
  UNTITLED_TEMPLATE,
  UNTITLED_TIMELINE,
} from '../components/timeline/properties/translations';
import { timelineSelectors } from '../store/timeline';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { timelineDefaults } from '../store/timeline/defaults';

export interface UseTimelineTitleParams {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the portal
   */
  timelineId: string;
}

/**
 * Retrieves
 */
export const useTimelineTitle = ({ timelineId }: UseTimelineTitleParams): string => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { timelineType, title: savedTitle } = useDeepEqualSelector((state) =>
    pick(['timelineType', 'title'], getTimeline(state, timelineId) ?? timelineDefaults)
  );

  return useMemo(
    () =>
      !isEmpty(savedTitle)
        ? savedTitle
        : timelineType === TimelineType.template
        ? UNTITLED_TEMPLATE
        : UNTITLED_TIMELINE,
    [savedTitle, timelineType]
  );
};
