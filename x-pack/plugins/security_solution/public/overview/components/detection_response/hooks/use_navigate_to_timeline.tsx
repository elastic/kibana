/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';

import { getDataProvider } from '../../../../common/components/event_details/table/use_action_cell_data_provider';
import { sourcererActions } from '../../../../common/store/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import type { DataProvider } from '../../../../../common/types/timeline';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { useCreateTimeline } from '../../../../timelines/components/timeline/properties/use_create_timeline';
import { updateProviders } from '../../../../timelines/store/timeline/actions';

export const useNavigateToTimeline = () => {
  const dispatch = useDispatch();

  const clearTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });

  const navigateToTimeline = (dataProvider: DataProvider) => {
    // Reset the current timeline
    clearTimeline();
    // Update the timeline's providers to match the current prevalence field query
    dispatch(
      updateProviders({
        id: TimelineId.active,
        providers: [dataProvider],
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
  };

  const openHostInTimeline = ({ hostName, severity }: { hostName: string; severity?: string }) => {
    const dataProvider = getDataProvider('host.name', '', hostName);

    if (severity) {
      dataProvider.and.push(getDataProvider('kibana.alert.severity', '', severity));
    }

    navigateToTimeline(dataProvider);
  };

  const openUserInTimeline = ({ userName, severity }: { userName: string; severity?: string }) => {
    const dataProvider = getDataProvider('user.name', '', userName);

    if (severity) {
      dataProvider.and.push(getDataProvider('kibana.alert.severity', '', severity));
    }
    navigateToTimeline(dataProvider);
  };

  const openRuleInTimeline = (ruleName: string) => {
    const dataProvider = getDataProvider('kibana.alert.rule.name', '', ruleName);

    navigateToTimeline(dataProvider);
  };

  return {
    openHostInTimeline,
    openRuleInTimeline,
    openUserInTimeline,
  };
};
