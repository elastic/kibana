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
import { timelineSelectors } from '../store';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { timelineDefaults } from '../store/defaults';

export interface UseTimelineTitleParams {
  /**
   * Id of the current timeline
   */
  timelineId: string;
}

/**
 * Returns the title of the timeline.
 * If the timeline has been saved, it will return the saved title.
 * If the timeline is not saved, it will return the default 'Untitled timeline'.
 * If the timeline is a template, it will return the default 'Untitled template'.
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
