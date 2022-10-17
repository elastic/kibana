/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { useDispatch } from 'react-redux';

import { sourcererSelectors } from '../../../store';
import { InputsModelId } from '../../../store/inputs/constants';
import { inputsActions } from '../../../store/inputs';
import { updateProviders, setFilters } from '../../../../timelines/store/timeline/actions';
import { sourcererActions } from '../../../store/actions';
import { SourcererScopeName } from '../../../store/sourcerer/model';
import type { DataProvider } from '../../../../../common/types';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { useCreateTimeline } from '../../../../timelines/components/timeline/properties/use_create_timeline';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';
import { useDeepEqualSelector } from '../../../hooks/use_selector';

export const InvestigateInTimelineButton: React.FunctionComponent<{
  asEmptyButton: boolean;
  dataProviders: DataProvider[] | null;
  filters?: Filter[] | null;
}> = ({ asEmptyButton, children, dataProviders, filters, ...rest }) => {
  const dispatch = useDispatch();

  const getDataViewsSelector = useMemo(
    () => sourcererSelectors.getSourcererDataViewsSelector(),
    []
  );
  const { defaultDataView, signalIndexName } = useDeepEqualSelector((state) =>
    getDataViewsSelector(state)
  );

  const clearTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });

  const configureAndOpenTimeline = React.useCallback(() => {
    if (dataProviders || filters) {
      // Reset the current timeline
      clearTimeline();
      if (dataProviders) {
        // Update the timeline's providers to match the current prevalence field query
        dispatch(
          updateProviders({
            id: TimelineId.active,
            providers: dataProviders,
          })
        );
      }
      // Use filters if more than a certain amount of ids for dom performance.
      if (filters) {
        dispatch(
          setFilters({
            id: TimelineId.active,
            filters,
          })
        );
      }
      // Only show detection alerts
      // (This is required so the timeline event count matches the prevalence count)
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: [signalIndexName || ''],
        })
      );
      // Unlock the time range from the global time range
      dispatch(inputsActions.removeLinkTo([InputsModelId.timeline, InputsModelId.global]));
    }
  }, [dataProviders, clearTimeline, dispatch, defaultDataView.id, signalIndexName, filters]);

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
