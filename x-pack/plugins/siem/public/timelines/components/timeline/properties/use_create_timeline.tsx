/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { timelineActions } from '../../../store/timeline';
import { TimelineTypeLiteral } from '../../../../../common/types/timeline';

export const useCreateTimelineButton = ({
  timelineId,
  timelineType,
  closeGearMenu,
}: {
  timelineId?: string;
  timelineType: TimelineTypeLiteral;
  closeGearMenu?: () => void;
}) => {
  const dispatch = useDispatch();

  const createTimeline = useCallback(
    ({ id, show }) =>
      dispatch(
        timelineActions.createTimeline({
          id,
          columns: defaultHeaders,
          show,
          timelineType,
        })
      ),
    [dispatch]
  );

  const handleButtonClick = useCallback(() => {
    createTimeline({ id: timelineId, show: true, timelineType });
    if (typeof closeGearMenu === 'function') {
      closeGearMenu();
    }
  }, [createTimeline, timelineId, closeGearMenu]);

  const getButton = useCallback(
    ({ outline, title }: { outline?: boolean; title?: string }) => {
      const buttonProps = {
        iconType: 'plusInCircle',
        onClick: handleButtonClick,
      };
      return outline ? (
        <EuiButton data-test-subj="timeline-new-with-border" {...buttonProps} fill>
          {title}
        </EuiButton>
      ) : (
        <EuiButtonEmpty data-test-subj="timeline-new" color="text" {...buttonProps}>
          {title}
        </EuiButtonEmpty>
      );
    },
    [handleButtonClick]
  );

  return { getButton };
};
