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
import { useFullScreen } from '../../../../common/containers/use_full_screen';
import {
  TimelineId,
  TimelineType,
  TimelineTypeLiteral,
} from '../../../../../common/types/timeline';

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
  const { timelineFullScreen, setTimelineFullScreen } = useFullScreen();

  const createTimeline = useCallback(
    ({ id, show }) => {
      if (id === TimelineId.active && timelineFullScreen) {
        setTimelineFullScreen(false);
      }

      dispatch(
        timelineActions.createTimeline({
          id,
          columns: defaultHeaders,
          show,
          timelineType,
        })
      );
    },
    [dispatch, setTimelineFullScreen, timelineFullScreen, timelineType]
  );

  const handleButtonClick = useCallback(() => {
    createTimeline({ id: timelineId, show: true, timelineType });
    if (typeof closeGearMenu === 'function') {
      closeGearMenu();
    }
  }, [createTimeline, timelineId, timelineType, closeGearMenu]);

  const getButton = useCallback(
    ({ outline, title }: { outline?: boolean; title?: string }) => {
      const buttonProps = {
        iconType: 'plusInCircle',
        onClick: handleButtonClick,
      };
      const dataTestSubjPrefix =
        timelineType === TimelineType.template ? `template-timeline-new` : `timeline-new`;
      return outline ? (
        <EuiButton data-test-subj={`${dataTestSubjPrefix}-with-border`} {...buttonProps} fill>
          {title}
        </EuiButton>
      ) : (
        <EuiButtonEmpty data-test-subj={dataTestSubjPrefix} color="text" {...buttonProps}>
          {title}
        </EuiButtonEmpty>
      );
    },
    [handleButtonClick, timelineType]
  );

  return { getButton };
};
