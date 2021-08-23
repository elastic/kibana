/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from 'kibana/public';
import moment from 'moment';
import { firstValueFrom } from '@kbn/std';
import { takeUntil } from 'rxjs/operators';
import { from, ReplaySubject } from 'rxjs';
import React from 'react';
import { getInitialGroupsMap } from '../../application/components/job_selector/job_selector';
import {
  KibanaContextProvider,
  toMountPoint,
} from '../../../../../../src/plugins/kibana_react/public';
import { getMlGlobalServices } from '../../application/app';
import { DashboardConstants } from '../../../../../../src/plugins/dashboard/public';
import { JobId } from '../../../common/types/anomaly_detection_jobs';
import { JobSelectorFlyout } from './components/job_selector_flyout';

interface Result {
  jobIds: string[];
  groups: Array<{ groupId: string; jobIds: string[] }>;
}

/**
 * Handles Anomaly detection jobs selection by a user.
 * Intended to use independently of the ML app context,
 * for instance on the dashboard for embeddables initialization.
 *
 * @param coreStart
 * @param selectedJobIds
 */
export async function resolveJobSelection(
  coreStart: CoreStart,
  selectedJobIds?: JobId[]
): Promise<Result> {
  const {
    http,
    uiSettings,
    application: { currentAppId$ },
  } = coreStart;

  const maps = {
    groupsMap: getInitialGroupsMap([]),
    jobsMap: {},
  };

  const result$ = new ReplaySubject<Result>(1);
  const tzConfig = uiSettings.get('dateFormat:tz');
  const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

  const onFlyoutClose = async () => {
    await flyoutSession.close();
    result$.error(new Error('canceled'));
  };

  const onSelectionConfirmed = async ({
    jobIds,
    groups,
  }: {
    jobIds: string[];
    groups: Array<{ groupId: string; jobIds: string[] }>;
  }) => {
    await flyoutSession.close();
    result$.next({ jobIds, groups });
  };

  const flyoutSession = coreStart.overlays.openFlyout(
    toMountPoint(
      <KibanaContextProvider services={{ ...coreStart, mlServices: getMlGlobalServices(http) }}>
        <JobSelectorFlyout
          selectedIds={selectedJobIds}
          withTimeRangeSelector={false}
          dateFormatTz={dateFormatTz}
          singleSelection={false}
          timeseriesOnly={true}
          onFlyoutClose={onFlyoutClose}
          onSelectionConfirmed={onSelectionConfirmed}
          maps={maps}
        />
      </KibanaContextProvider>
    ),
    {
      'data-test-subj': 'mlFlyoutJobSelector',
      ownFocus: true,
      closeButtonAriaLabel: 'jobSelectorFlyout',
    }
  );

  // Close the flyout when user navigates out of the dashboard plugin
  currentAppId$.pipe(takeUntil(from(flyoutSession.onClose))).subscribe((appId) => {
    if (appId !== DashboardConstants.DASHBOARDS_ID) {
      flyoutSession.close();
    }
  });

  return await firstValueFrom(result$);
}
