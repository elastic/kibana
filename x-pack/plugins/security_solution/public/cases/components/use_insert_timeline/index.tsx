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
import { setInsertTimeline } from '../../../timelines/store/timeline/actions';

export interface UseInsertTimelineReturn {
  handleOnTimelineChange: (title: string, id: string | null, graphEventId?: string) => void;
}

export const useInsertTimeline = (
  value: string,
  onChange: (newValue: string) => void
): UseInsertTimelineReturn => {
  const dispatch = useDispatch();
  const { formatUrl } = useFormatUrl(SecurityPageName.timelines);

  const insertTimeline = useShallowEqualSelector(timelineSelectors.selectInsertTimeline);

  const handleOnTimelineChange = useCallback(
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
    if (insertTimeline != null && value != null) {
      dispatch(timelineActions.showTimeline({ id: insertTimeline.timelineId, show: false }));
      handleOnTimelineChange(
        insertTimeline.timelineTitle,
        insertTimeline.timelineSavedObjectId,
        insertTimeline.graphEventId
      );
      dispatch(setInsertTimeline(null));
    }
  }, [insertTimeline, dispatch, handleOnTimelineChange, value]);

  return {
    handleOnTimelineChange,
  };
};
