/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'typescript-fsa';
import { DispatchUpdateTimeline } from '../../../timelines/components/open_timeline/types';
import { queryTimelineById } from '../../../timelines/components/open_timeline/helpers';
import { TimelineTabs } from '../../../../common/types/timeline';
import {
  decodeRisonUrlState,
  getQueryStringFromLocation,
  getParamFromQueryString,
} from './helpers';
import { TimelineUrl } from '../../../timelines/store/timeline/model';

const getQueryStringKeyValue = ({ search, urlKey }: { search: string; urlKey: string }) =>
  getParamFromQueryString(getQueryStringFromLocation(search), urlKey);

interface QueryTimelineIdOnUrlChange {
  oldSearch?: string;
  search: string;
  timelineIdFromReduxStore: string;
  updateTimeline: DispatchUpdateTimeline;
  updateTimelineIsLoading: (status: { id: string; isLoading: boolean }) => Action<{
    id: string;
    isLoading: boolean;
  }>;
}

export const queryTimelineByIdOnUrlChange = ({
  oldSearch,
  search,
  timelineIdFromReduxStore,
  updateTimeline,
  updateTimelineIsLoading,
}: QueryTimelineIdOnUrlChange) => {
  const oldUrlStateString = getQueryStringKeyValue({
    urlKey: 'timeline',
    search: oldSearch ?? '',
  });

  const newUrlStateString = getQueryStringKeyValue({ urlKey: 'timeline', search });

  if (oldUrlStateString != null && newUrlStateString != null) {
    let newTimeline = null;
    let oldTimeline = null;
    try {
      newTimeline = decodeRisonUrlState<TimelineUrl>(newUrlStateString);
    } catch (error) {
      // do nothing as timeline is defaulted to null
    }

    try {
      oldTimeline = decodeRisonUrlState<TimelineUrl>(oldUrlStateString);
    } catch (error) {
      // do nothing as timeline is defaulted to null
    }
    const newId = newTimeline?.id;
    const oldId = oldTimeline?.id;

    if (newId && newId !== oldId && newId !== timelineIdFromReduxStore) {
      queryTimelineById({
        activeTimelineTab: newTimeline?.activeTab ?? TimelineTabs.query,
        duplicate: false,
        graphEventId: newTimeline?.graphEventId,
        timelineId: newId,
        openTimeline: true,
        updateIsLoading: updateTimelineIsLoading,
        updateTimeline,
      });
    }
  }
};
