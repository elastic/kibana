/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty } from 'lodash/fp';

import { getTimelineUrl, useFormatUrl } from '../../../common/components/link_to';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { timelineSelectors, timelineActions } from '../../../timelines/store/timeline';
import { SecurityPageName } from '../../../app/types';
import { setAttachTimeline } from '../../../timelines/store/timeline/actions';

interface UseInsertTimelineReturn {
  handleOnTimelineAttached: (title: string, id: string | null, graphEventId?: string) => void;
}

export const useInsertTimeline = (
  value: string,
  onChange: (newValue: string) => void
): UseInsertTimelineReturn => {
  const dispatch = useDispatch();
  const { formatUrl } = useFormatUrl(SecurityPageName.timelines);

  const attachTimeline = useShallowEqualSelector(timelineSelectors.selectAttachTimeline);

  const handleOnTimelineAttached = useCallback(
    (title: string, id: string | null, graphEventId?: string) => {
      const url = formatUrl(getTimelineUrl(id ?? '', graphEventId), {
        absolute: true,
        skipSearch: true,
      });

      let newValue = `[${title}](${url})`;
      // Leave a space between the previous value and the timeline url if the value is not empty.
      if (!isEmpty(value)) {
        newValue = `${value} ${newValue}`;
      }

      onChange(newValue);
    },
    [value, onChange, formatUrl]
  );

  useEffect(() => {
    if (attachTimeline != null && value != null) {
      dispatch(timelineActions.showTimeline({ id: attachTimeline.timelineId, show: false }));
      handleOnTimelineAttached(
        attachTimeline.timelineTitle,
        attachTimeline.timelineSavedObjectId,
        attachTimeline.graphEventId
      );
      dispatch(setAttachTimeline(null));
    }
  }, [attachTimeline, dispatch, handleOnTimelineAttached, value]);

  return {
    handleOnTimelineAttached,
  };
};
