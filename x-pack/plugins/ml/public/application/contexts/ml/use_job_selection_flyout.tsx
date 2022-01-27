/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import moment from 'moment';
import { useMlKibana } from '../kibana';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { JobSelectorFlyout } from '../../../embeddables/common/components/job_selector_flyout';
import { getInitialGroupsMap } from '../../components/job_selector/job_selector';
import type { JobSelectionResult } from '../../components/job_selector/job_selector_flyout';

export type GetJobSelection = ReturnType<typeof useJobSelectionFlyout>;

/**
 * Hook for invoking Anomaly Detection jobs selection
 * inside the ML app.
 */
export function useJobSelectionFlyout() {
  const { overlays, services } = useMlKibana();

  return useCallback(
    (
      config: {
        singleSelection?: boolean;
        withTimeRangeSelector?: boolean;
        timeseriesOnly?: boolean;
      } = {
        singleSelection: false,
        withTimeRangeSelector: true,
        timeseriesOnly: false,
      }
    ): Promise<JobSelectionResult> => {
      const { uiSettings } = services;

      const tzConfig = uiSettings.get('dateFormat:tz');
      const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();
      const maps = {
        groupsMap: getInitialGroupsMap([]),
        jobsMap: {},
      };

      return new Promise(async (resolve, reject) => {
        try {
          const flyoutSession = overlays.openFlyout(
            <KibanaContextProvider services={services}>
              <JobSelectorFlyout
                selectedIds={[]}
                withTimeRangeSelector={config.withTimeRangeSelector}
                dateFormatTz={dateFormatTz}
                singleSelection={!!config.singleSelection}
                timeseriesOnly={!!config.timeseriesOnly}
                onFlyoutClose={() => {
                  reject();
                  flyoutSession.close();
                }}
                onSelectionConfirmed={(payload) => {
                  resolve(payload);
                  flyoutSession.close();
                }}
                maps={maps}
              />
            </KibanaContextProvider>
          );
        } catch (error) {
          reject(error);
        }
      });
    },
    [overlays, services]
  );
}
