/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty } from 'lodash/fp';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

import { SecurityPageName } from '../../components/actions/timeline/cases/add_to_case_action';
import { TimelinesStartServices } from '../../types';
import { useShallowEqualSelector } from '../use_selector';
import { setInsertTimeline, showTimeline } from '../../store/t_grid/actions';
import { selectInsertTimeline } from '../../store/t_grid/selectors';

export interface UseInsertTimelineReturn {
  handleOnTimelineChange: (title: string, id: string | null, graphEventId?: string) => void;
}

export const getTimelineUrl = (id: string, graphEventId?: string) =>
  `?timeline=(id:'${id}',isOpen:!t${
    isEmpty(graphEventId) ? ')' : `,graphEventId:'${graphEventId}')`
  }`;

export const useInsertTimeline = (
  value: string,
  onChange: (newValue: string) => void
): UseInsertTimelineReturn => {
  const dispatch = useDispatch();
  const {
    application: { getUrlForApp },
  } = useKibana<TimelinesStartServices>().services;

  const insertTimeline = useShallowEqualSelector(selectInsertTimeline);

  const handleOnTimelineChange = useCallback(
    (title: string, id: string | null, graphEventId?: string) => {
      const url =
        getUrlForApp(SecurityPageName.case, { absolute: true }) +
        getTimelineUrl(id ?? '', graphEventId);

      let newValue = `[${title}](${url})`;
      // Leave a space between the previous value and the timeline url if the value is not empty.
      if (!isEmpty(value)) {
        newValue = `${value} ${newValue}`;
      }

      onChange(newValue);
    },
    [value, onChange, getUrlForApp]
  );

  useEffect(() => {
    if (insertTimeline != null && value != null) {
      dispatch(showTimeline({ id: insertTimeline.timelineId, show: false }));
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
