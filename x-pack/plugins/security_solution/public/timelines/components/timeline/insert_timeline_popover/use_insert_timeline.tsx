/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { SecurityPageName } from '../../../../../common/constants';
import { getTimelineUrl, useFormatUrl } from '../../../../common/components/link_to';
import { CursorPosition } from '../../../../common/components/markdown_editor';
import { timelineActions, timelineSelectors } from '../../../../timelines/store/timeline';
import { setInsertTimeline } from '../../../store/timeline/actions';

export const useInsertTimeline = (value: string, onChange: (newValue: string) => void) => {
  const dispatch = useDispatch();
  const { formatUrl } = useFormatUrl(SecurityPageName.timelines);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    start: 0,
    end: 0,
  });

  const insertTimeline = useShallowEqualSelector(timelineSelectors.selectInsertTimeline);

  const handleOnTimelineChange = useCallback(
    (title: string, id: string | null, graphEventId?: string) => {
      const url = formatUrl(getTimelineUrl(id ?? '', graphEventId), {
        absolute: true,
        skipSearch: true,
      });

      const newValue: string = [
        value.slice(0, cursorPosition.start),
        cursorPosition.start === cursorPosition.end
          ? `[${title}](${url})`
          : `[${value.slice(cursorPosition.start, cursorPosition.end)}](${url})`,
        value.slice(cursorPosition.end),
      ].join('');

      onChange(newValue);
    },
    [value, onChange, cursorPosition, formatUrl]
  );

  const handleCursorChange = useCallback((cp: CursorPosition) => {
    setCursorPosition(cp);
  }, []);

  // insertTimeline selector is defined to attached a timeline to a case outside of the case page.
  // FYI, if you are in the case page we only use handleOnTimelineChange to attach a timeline to a case.
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
    cursorPosition,
    handleCursorChange,
    handleOnTimelineChange,
  };
};
