/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from 'kibana/public';
import moment from 'moment';
import { takeUntil } from 'rxjs/operators';
import { from } from 'rxjs';
import React from 'react';
import { getInitialGroupsMap } from '../../application/components/job_selector/job_selector';
import {
  KibanaContextProvider,
  toMountPoint,
  wrapWithTheme,
} from '../../../../../../src/plugins/kibana_react/public';
import { getMlGlobalServices } from '../../application/app';
import { DashboardConstants } from '../../../../../../src/plugins/dashboard/public';
import { JobId } from '../../../common/types/anomaly_detection_jobs';
import { JobSelectorFlyout } from './components/job_selector_flyout';

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
): Promise<{ jobIds: string[]; groups: Array<{ groupId: string; jobIds: string[] }> }> {
  const {
    http,
    uiSettings,
    theme,
    application: { currentAppId$ },
  } = coreStart;

  return new Promise(async (resolve, reject) => {
    try {
      const maps = {
        groupsMap: getInitialGroupsMap([]),
        jobsMap: {},
      };
      const tzConfig = uiSettings.get('dateFormat:tz');
      const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

      const onFlyoutClose = () => {
        flyoutSession.close();
        reject();
      };

      const onSelectionConfirmed = async ({
        jobIds,
        groups,
      }: {
        jobIds: string[];
        groups: Array<{
          groupId: string;
          jobIds: string[];
        }>;
      }) => {
        await flyoutSession.close();
        resolve({
          jobIds,
          groups,
        });
      };

      const flyoutSession = coreStart.overlays.openFlyout(
        toMountPoint(
          wrapWithTheme(
            <KibanaContextProvider
              services={{ ...coreStart, mlServices: getMlGlobalServices(http) }}
            >
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
            </KibanaContextProvider>,
            theme.theme$
          )
        ),
        {
          'data-test-subj': 'mlFlyoutJobSelector',
          ownFocus: true,
          closeButtonAriaLabel: 'jobSelectorFlyout',
        }
      ); // Close the flyout when user navigates out of the dashboard plugin

      currentAppId$.pipe(takeUntil(from(flyoutSession.onClose))).subscribe((appId) => {
        if (appId !== DashboardConstants.DASHBOARDS_ID) {
          flyoutSession.close();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
