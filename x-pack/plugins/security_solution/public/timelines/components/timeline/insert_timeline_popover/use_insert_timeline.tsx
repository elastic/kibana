/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useBasePath } from '../../../../common/lib/kibana';
import { CursorPosition } from '../../../../common/components/markdown_editor';
import { FormData, FormHook } from '../../../../shared_imports';
import { timelineActions, timelineSelectors } from '../../../../timelines/store/timeline';
import { setInsertTimeline } from '../../../store/timeline/actions';
import { State } from '../../../../common/store';

export const useInsertTimeline = <T extends FormData>(form: FormHook<T>, fieldName: string) => {
  const basePath = window.location.origin + useBasePath();
  const dispatch = useDispatch();
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    start: 0,
    end: 0,
  });

  const insertTimeline = useSelector((state: State) => {
    return timelineSelectors.selectInsertTimeline(state);
  });

  const handleOnTimelineChange = useCallback(
    (title: string, id: string | null, graphEventId?: string) => {
      const builtLink = `${basePath}/app/security/timelines?timeline=(id:'${id}'${
        !isEmpty(graphEventId) ? `,graphEventId:'${graphEventId}'` : ''
      },isOpen:!t)`;

      const currentValue = form.getFormData()[fieldName];
      const newValue: string = [
        currentValue.slice(0, cursorPosition.start),
        cursorPosition.start === cursorPosition.end
          ? `[${title}](${builtLink})`
          : `[${currentValue.slice(cursorPosition.start, cursorPosition.end)}](${builtLink})`,
        currentValue.slice(cursorPosition.end),
      ].join('');

      form.setFieldValue(fieldName, newValue);
    },
    [basePath, cursorPosition, fieldName, form]
  );

  const handleCursorChange = useCallback((cp: CursorPosition) => {
    setCursorPosition(cp);
  }, []);

  // insertTimeline selector is defined to attached a timeline to a case outside of the case page.
  // FYI, if you are in the case page we only use handleOnTimelineChange to attach a timeline to a case.
  useEffect(() => {
    const currentValue = form.getFormData()[fieldName];
    if (insertTimeline != null && currentValue != null) {
      dispatch(timelineActions.showTimeline({ id: insertTimeline.timelineId, show: false }));
      handleOnTimelineChange(
        insertTimeline.timelineTitle,
        insertTimeline.timelineSavedObjectId,
        insertTimeline.graphEventId
      );
      dispatch(setInsertTimeline(null));
    }
  }, [insertTimeline, dispatch, form, handleOnTimelineChange, fieldName]);

  return {
    cursorPosition,
    handleCursorChange,
    handleOnTimelineChange,
  };
};
