/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { useLocation } from 'react-router-dom';
import usePrevious from 'react-use/lib/usePrevious';
import { useDispatch } from 'react-redux';
import type { TimelineUrl } from '../../../timelines/store/timeline/model';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId, TimelineTabs } from '../../../../common/types';
import { useShallowEqualSelector } from '../use_selector';

import {
  dispatchUpdateTimeline,
  queryTimelineById,
} from '../../../timelines/components/open_timeline/helpers';
import {
  decodeRisonUrlState,
  getParamFromQueryString,
  getQueryStringFromLocation,
} from '../../utils/global_query_string/helpers';
import { URL_PARAM_KEY } from '../use_url_state';

/**
 * After the initial load of the security solution, timeline is not updated when the timeline url search value is changed
 * This is because those state changes happen in place and doesn't lead to a requerying of data for the new id.
 * To circumvent this for the sake of the redirects needed for the saved object Id changes happening in 8.0
 * We are actively pulling the id changes that take place for timeline in the url and calling the query below
 * to request the new data.
 */

// TODO change the name. OnUrlChange
// TODO TEST THIS SCENARIO https://github.com/elastic/kibana/pull/107099#issuecomment-891147792
export const useQueryTimelineByIdOnUrlChange = () => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const flyoutTimeline = useShallowEqualSelector((state) => getTimeline(state, TimelineId.active));
  const { search } = useLocation();
  const oldSearch = usePrevious(search);
  const timelineIdFromReduxStore = flyoutTimeline?.savedObjectId ?? '';
  const dispatch = useDispatch();

  useEffect(() => {
    const oldUrlStateString = getQueryStringKeyValue({
      urlKey: URL_PARAM_KEY.timeline,
      search: oldSearch ?? '',
    });

    const newUrlStateString = getQueryStringKeyValue({ urlKey: URL_PARAM_KEY.timeline, search });

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
          updateIsLoading: (status: { id: string; isLoading: boolean }) =>
            dispatch(timelineActions.updateIsLoading(status)),
          updateTimeline: dispatchUpdateTimeline(dispatch),
        });
      }
    }
  }, [search, oldSearch, timelineIdFromReduxStore, dispatch]);
};

const getQueryStringKeyValue = ({ search, urlKey }: { search: string; urlKey: string }) =>
  getParamFromQueryString(getQueryStringFromLocation(search), urlKey);
