/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { useDispatch } from 'react-redux';

import { inputsActions } from '../../../store/inputs';
import { updateProviders } from '../../../../timelines/store/timeline/actions';
import { sourcererActions } from '../../../store/actions';
import { SourcererScopeName } from '../../../store/sourcerer/model';
import type { DataProvider } from '../../../../../common/types';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { useCreateTimeline } from '../../../../timelines/components/timeline/properties/use_create_timeline';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';

export const InvestigateInTimelineButton: React.FunctionComponent<{
  asEmptyButton: boolean;
  dataProviders: DataProvider[];
}> = ({ asEmptyButton, children, dataProviders, ...rest }) => {
  const dispatch = useDispatch();

  const clearTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });

  const configureAndOpenTimeline = React.useCallback(() => {
    if (dataProviders) {
      // Reset the current timeline
      clearTimeline();
      // Update the timeline's providers to match the current prevalence field query
      dispatch(
        updateProviders({
          id: TimelineId.active,
          providers: dataProviders,
        })
      );
      // Only show detection alerts
      // (This is required so the timeline event count matches the prevalence count)
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: 'security-solution-default',
          selectedPatterns: ['.alerts-security.alerts-default'],
        })
      );
      // Unlock the time range from the global time range
      dispatch(inputsActions.removeGlobalLinkTo());
    }
  }, [dispatch, clearTimeline, dataProviders]);

  return asEmptyButton ? (
    <EuiButtonEmpty
      aria-label={ACTION_INVESTIGATE_IN_TIMELINE}
      onClick={configureAndOpenTimeline}
      flush="right"
      size="xs"
    >
      {children}
    </EuiButtonEmpty>
  ) : (
    <EuiButton
      aria-label={ACTION_INVESTIGATE_IN_TIMELINE}
      onClick={configureAndOpenTimeline}
      {...rest}
    >
      {children}
    </EuiButton>
  );
};

InvestigateInTimelineButton.displayName = 'InvestigateInTimelineButton';
