/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { InputsModelId } from '../../../../common/store/inputs/constants';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { timelineActions } from '../../../store/timeline';
import { useTimelineFullScreen } from '../../../../common/containers/use_full_screen';
import type { TimelineTypeLiteral } from '../../../../../common/types/timeline';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsActions, inputsSelectors } from '../../../../common/store/inputs';
import { sourcererActions, sourcererSelectors } from '../../../../common/store/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { appActions } from '../../../../common/store/app';
import type { TimeRange } from '../../../../common/store/inputs/model';

interface Props {
  timelineId?: string;
  timelineType: TimelineTypeLiteral;
  closeGearMenu?: () => void;
  timeRange?: TimeRange;
}

export const useCreateTimeline = ({ timelineId, timelineType, closeGearMenu }: Props) => {
  const dispatch = useDispatch();
  const defaultDataViewSelector = useMemo(() => sourcererSelectors.defaultDataViewSelector(), []);
  const { id: dataViewId, patternList: selectedPatterns } =
    useDeepEqualSelector(defaultDataViewSelector);

  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();
  const globalTimeRange = useDeepEqualSelector(inputsSelectors.globalTimeRangeSelector);

  const createTimeline = useCallback(
    ({ id, show, timeRange: timeRangeParam }) => {
      const timerange = timeRangeParam ?? globalTimeRange;

      if (id === TimelineId.active && timelineFullScreen) {
        setTimelineFullScreen(false);
      }
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: dataViewId,
          selectedPatterns,
        })
      );
      dispatch(
        timelineActions.createTimeline({
          columns: defaultHeaders,
          dataViewId,
          id,
          indexNames: selectedPatterns,
          show,
          timelineType,
        })
      );

      dispatch(
        timelineActions.setTimelineUpdatedAt({
          id: TimelineId.active,
          updated: undefined,
        })
      );
      dispatch(inputsActions.addLinkTo([InputsModelId.global, InputsModelId.timeline]));
      dispatch(appActions.addNotes({ notes: [] }));

      if (timeRangeParam) {
        dispatch(inputsActions.removeLinkTo([InputsModelId.timeline, InputsModelId.global]));
      }

      if (timerange.kind === 'absolute') {
        dispatch(
          inputsActions.setAbsoluteRangeDatePicker({
            ...timerange,
            id: InputsModelId.timeline,
          })
        );
      } else if (timerange.kind === 'relative') {
        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            ...timerange,
            id: InputsModelId.timeline,
          })
        );
      }
    },
    [
      dispatch,
      globalTimeRange,
      dataViewId,
      selectedPatterns,
      setTimelineFullScreen,
      timelineFullScreen,
      timelineType,
    ]
  );

  const handleCreateNewTimeline = useCallback(
    (options?: CreateNewTimelineOptions) => {
      createTimeline({ id: timelineId, show: true, timelineType, timeRange: options?.timeRange });
      if (typeof closeGearMenu === 'function') {
        closeGearMenu();
      }
    },
    [createTimeline, timelineId, timelineType, closeGearMenu]
  );

  return handleCreateNewTimeline;
};

interface CreateNewTimelineOptions {
  timeRange?: TimeRange;
}

export const useCreateTimelineButton = ({ timelineId, timelineType, closeGearMenu }: Props) => {
  const handleCreateNewTimeline = useCreateTimeline({
    timelineId,
    timelineType,
    closeGearMenu,
  });

  const getButton = useCallback(
    ({
      outline,
      title,
      iconType = 'plusInCircle',
      fill = true,
      isDisabled = false,
    }: {
      outline?: boolean;
      title?: string;
      iconType?: string;
      fill?: boolean;
      isDisabled?: boolean;
    }) => {
      const buttonProps = {
        iconType,
        onClick: () => handleCreateNewTimeline(),
        fill,
      };
      const dataTestSubjPrefix =
        timelineType === TimelineType.template ? `template-timeline-new` : `timeline-new`;
      const { fill: noThanks, ...propsWithoutFill } = buttonProps;
      return outline ? (
        <EuiButton data-test-subj={`${dataTestSubjPrefix}-with-border`} {...buttonProps}>
          {title}
        </EuiButton>
      ) : (
        <EuiButtonEmpty data-test-subj={dataTestSubjPrefix} color="text" {...propsWithoutFill}>
          {title}
        </EuiButtonEmpty>
      );
    },
    [handleCreateNewTimeline, timelineType]
  );

  return { getButton };
};
