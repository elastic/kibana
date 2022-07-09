/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { useDispatch } from 'react-redux';

import type { AlertSummaryRow } from '../helpers';
import { inputsActions } from '../../../store/inputs';
import { updateProviders } from '../../../../timelines/store/timeline/actions';
import { sourcererActions } from '../../../store/actions';
import { SourcererScopeName } from '../../../store/sourcerer/model';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { useActionCellDataProvider } from './use_action_cell_data_provider';
import { useCreateTimeline } from '../../../../timelines/components/timeline/properties/use_create_timeline';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';

export const InvestigateInTimelineButton = React.memo<
  React.PropsWithChildren<AlertSummaryRow['description']>
>(({ data, eventId, fieldFromBrowserField, linkValue, timelineId, values, children }) => {
  const dispatch = useDispatch();

  const actionCellConfig = useActionCellDataProvider({
    contextId: timelineId,
    eventId,
    field: data.field,
    fieldFormat: data.format,
    fieldFromBrowserField,
    fieldType: data.type,
    isObjectArray: data.isObjectArray,
    linkValue,
    values,
  });

  const clearTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });

  const configureAndOpenTimeline = React.useCallback(() => {
    if (actionCellConfig?.dataProvider) {
      // Reset the current timeline
      clearTimeline();
      // Update the timeline's providers to match the current prevalence field query
      dispatch(
        updateProviders({
          id: TimelineId.active,
          providers: actionCellConfig.dataProvider,
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
  }, [dispatch, clearTimeline, actionCellConfig]);

  const showButton = values != null && !isEmpty(actionCellConfig?.dataProvider);

  if (showButton) {
    return (
      <EuiButtonEmpty
        aria-label={ACTION_INVESTIGATE_IN_TIMELINE}
        onClick={configureAndOpenTimeline}
        flush="right"
        size="xs"
      >
        {children}
      </EuiButtonEmpty>
    );
  } else {
    return null;
  }
});

InvestigateInTimelineButton.displayName = 'InvestigateInTimelineButton';
