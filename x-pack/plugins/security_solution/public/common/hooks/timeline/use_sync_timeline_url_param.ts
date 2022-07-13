/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { useUpdateUrlParam } from '../../utils/global_query_string';
import { CONSTANTS } from '../../components/url_state/constants';
import type { TimelineUrl } from '../../../timelines/store/timeline/model';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId, TimelineTabs } from '../../../../common/types';
import { useShallowEqualSelector } from '../use_selector';

export const useSyncTimelineUrlParam = () => {
  const updateUrlParam = useUpdateUrlParam<TimelineUrl>(CONSTANTS.timeline);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const flyoutTimeline = useShallowEqualSelector((state) => getTimeline(state, TimelineId.active));

  useEffect(() => {
    updateUrlParam(
      flyoutTimeline != null
        ? {
            id: flyoutTimeline.savedObjectId != null ? flyoutTimeline.savedObjectId : '',
            isOpen: flyoutTimeline.show,
            activeTab: flyoutTimeline.activeTab,
            graphEventId: flyoutTimeline.graphEventId ?? '',
          }
        : { id: '', isOpen: false, activeTab: TimelineTabs.query, graphEventId: '' }
    );
  }, [flyoutTimeline, updateUrlParam]);
};
