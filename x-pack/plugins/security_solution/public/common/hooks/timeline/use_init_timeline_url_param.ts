/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { safeDecode } from '@kbn/rison';

import { TimelineTabs } from '../../../../common/types';
import { useInitializeUrlParam } from '../../utils/global_query_string';
import { useQueryTimelineById } from '../../../timelines/components/open_timeline/helpers';
import type { TimelineUrl } from '../../../timelines/store/model';
import { URL_PARAM_KEY } from '../use_url_state';
import { useIsExperimentalFeatureEnabled } from '../use_experimental_features';

export const useInitTimelineFromUrlParam = () => {
  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  const isEsqlTabDisabled = useIsExperimentalFeatureEnabled('timelineEsqlTabDisabled');

  const queryTimelineById = useQueryTimelineById();

  const onInitialize = useCallback(
    (initialState: TimelineUrl | null) => {
      if (initialState != null) {
        queryTimelineById({
          activeTimelineTab:
            initialState.activeTab === TimelineTabs.esql && isEsqlTabDisabled
              ? TimelineTabs.query
              : initialState.activeTab,
          duplicate: false,
          graphEventId: initialState.graphEventId,
          timelineId: initialState.id,
          openTimeline: initialState.isOpen,
          savedSearchId: initialState.savedSearchId,
          unifiedComponentsInTimelineEnabled,
        });
      }
    },
    [isEsqlTabDisabled, queryTimelineById, unifiedComponentsInTimelineEnabled]
  );

  useEffect(() => {
    const listener = () => {
      const timelineState = new URLSearchParams(window.location.search).get(URL_PARAM_KEY.timeline);

      if (!timelineState) {
        return;
      }

      const parsedState = safeDecode(timelineState) as TimelineUrl | null;

      onInitialize(parsedState);
    };

    // This is needed to initialize the timeline from the URL when the user clicks the back / forward buttons
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }, [onInitialize]);

  useInitializeUrlParam(URL_PARAM_KEY.timeline, onInitialize);
};
