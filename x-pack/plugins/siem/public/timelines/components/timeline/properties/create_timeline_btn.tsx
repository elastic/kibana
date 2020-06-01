/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { noop } from 'lodash/fp';

import { defaultHeaders } from '../body/column_headers/default_headers';

import { timelineActions } from '../../../store/timeline';
import { NewTimeline } from './helpers';
import { TimelineType, TimelineTypeLiteral } from '../../../../../common/types/timeline';
import { useKibana } from '../../../../common/lib/kibana';

interface OwnProps {
  onClosePopover?: () => void;
  outline?: boolean;
  title?: string;
  timelineId?: string;
  timelineType: TimelineTypeLiteral;
}

export const CreateTimelineBtnComponent: React.FC<OwnProps> = ({
  onClosePopover = noop,
  outline,
  title,
  timelineId = 'timeline-1',
  timelineType,
}) => {
  const uiCapabilities = useKibana().services.application.capabilities;
  const capabilitiesCanUserCRUD: boolean = !!uiCapabilities.siem.crud;
  const dispatch = useDispatch();
  const showTimeline = useCallback(() => dispatch(timelineActions.showTimeline(), []));
  const createTimeline = useCallback(
    ({ id, show }) => {
      return dispatch(
        timelineActions.createTimeline({
          id,
          columns: defaultHeaders,
          show,
          timelineType: timelineType ?? TimelineType.default,
        })
      );
    },
    [dispatch]
  );
  return capabilitiesCanUserCRUD ? (
    <NewTimeline
      createTimeline={createTimeline}
      data-test-subj="new-timeline-btn"
      onClosePopover={onClosePopover}
      outline={outline}
      showTimeline={showTimeline}
      timelineId={timelineId}
      timelineType={timelineType}
      title={title}
    />
  ) : null;
};

export const CreateTimelineBtn = React.memo(CreateTimelineBtnComponent);
CreateTimelineBtn.displayName = 'CreateTimelineBtn';
