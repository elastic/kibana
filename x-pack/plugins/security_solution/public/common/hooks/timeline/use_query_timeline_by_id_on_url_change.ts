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
 * After the initial load of the security solution, timeline is not updated when the timeline URL search value is changed
 * This is because those state changes happen in place and don't lead to querying data for the new id.
 *
 * But this scenario only happens when there are timelines with conflicted ids. Because it shows a HTML link to the conflicted
 * timeline, which we do not have control of. We already fetch the data on the onClick callback for all other timeline links in the APP.
 * For the conflict scenario, we are actively pulling the id changes that take place for the timeline in the URL and calling the query below
 * to request the new data.
 *
 * *** The conflict scenario can happen when migrating from an older version to 8.0+. Read more: https://github.com/elastic/kibana/issues/100489
 */
export const useQueryTimelineByIdOnUrlChange = () => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const flyoutTimeline = useShallowEqualSelector((state) => getTimeline(state, TimelineId.active));

  const { search } = useLocation();
  const oldSearch = usePrevious(search);
  const timelineIdFromReduxStore = flyoutTimeline?.savedObjectId ?? '';
  const dispatch = useDispatch();

  const [previousTimeline, currentTimeline] = useMemo(() => {
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

      return [oldTimeline, newTimeline];
    }

    return [null, null];
  }, [oldSearch, search]);

  const oldId = previousTimeline?.id;
  const { id: newId, activeTab, graphEventId } = currentTimeline || {};

  useEffect(() => {
    if (newId && newId !== oldId && newId !== timelineIdFromReduxStore) {
      queryTimelineById({
        activeTimelineTab: activeTab ?? TimelineTabs.query,
        duplicate: false,
        graphEventId,
        timelineId: newId,
        openTimeline: true,
        updateIsLoading: (status: { id: string; isLoading: boolean }) =>
          dispatch(timelineActions.updateIsLoading(status)),
        updateTimeline: dispatchUpdateTimeline(dispatch),
      });
    }
  }, [timelineIdFromReduxStore, dispatch, oldId, newId, activeTab, graphEventId]);
};

const getQueryStringKeyValue = ({ search, urlKey }: { search: string; urlKey: string }) =>
  getParamFromQueryString(getQueryStringFromLocation(search), urlKey);
