/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import moment from 'moment';
import { KibanaContextProvider, KibanaReactOverlays } from '@kbn/kibana-react-plugin/public';
import { useMlKibana } from '../kibana';
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

  const flyoutRef = useRef<ReturnType<KibanaReactOverlays['openFlyout']>>();

  useEffect(function closeFlyoutOnLeave() {
    return () => {
      if (flyoutRef.current) {
        flyoutRef.current.close();
      }
    };
  }, []);

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
          flyoutRef.current = overlays.openFlyout(
            <KibanaContextProvider services={services}>
              <JobSelectorFlyout
                selectedIds={[]}
                withTimeRangeSelector={config.withTimeRangeSelector}
                dateFormatTz={dateFormatTz}
                singleSelection={!!config.singleSelection}
                timeseriesOnly={!!config.timeseriesOnly}
                onFlyoutClose={() => {
                  reject();
                  flyoutRef.current!.close();
                }}
                onSelectionConfirmed={(payload) => {
                  resolve(payload);
                  flyoutRef.current!.close();
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
