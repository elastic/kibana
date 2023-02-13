/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useSpaceId } from '../../../hooks/use_space_id';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../lib/telemetry';
import {
  installedJobPrefix,
  uninstalledJobIdToInstalledJobId,
} from '../../ml/anomaly/use_anomalies_search';
import { setupMlJob, startDatafeeds, stopDatafeeds } from '../api';
import type { SecurityJob } from '../types';
import * as i18n from './translations';

// Enable/Disable Job & Datafeed -- passed to JobsTable for use as callback on JobSwitch
export const useEnableDataFeed = () => {
  const { addError } = useAppToasts();
  const [isLoading, setIsLoading] = useState(false);
  const spaceId = useSpaceId();

  const enableDatafeed = useCallback(
    async (job: SecurityJob, latestTimestampMs: number, enable: boolean) => {
      submitTelemetry(job, enable);

      if (!job.isInstalled) {
        setIsLoading(true);
        try {
          await setupMlJob({
            configTemplate: job.moduleId,
            indexPatternName: job.defaultIndexPattern,
            jobIdErrorFilter: [job.id],
            groups: job.groups,
            prefix: installedJobPrefix(spaceId),
          });
          setIsLoading(false);
        } catch (error) {
          addError(error, { title: i18n.CREATE_JOB_FAILURE });
          setIsLoading(false);
          return;
        }
      }

      // Max start time for job is no more than two weeks ago to ensure job performance
      const date = new Date();
      const maxStartTime = date.setDate(date.getDate() - 14);

      setIsLoading(true);
      if (enable) {
        const startTime = Math.max(latestTimestampMs, maxStartTime);
        try {
          await startDatafeeds({
            datafeedIds: [
              job.isInstalled
                ? `datafeed-${job.id}` // When the job is installed the job.id already contains the prefix.
                : `datafeed-${uninstalledJobIdToInstalledJobId(job.id, spaceId)}`,
            ],
            start: startTime,
          });
        } catch (error) {
          track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_ENABLE_FAILURE);
          addError(error, { title: i18n.START_JOB_FAILURE });
        }
      } else {
        try {
          await stopDatafeeds({ datafeedIds: [`datafeed-${job.id}`] }); // When the job is installed the job.id already contains the prefix.
        } catch (error) {
          track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_DISABLE_FAILURE);
          addError(error, { title: i18n.STOP_JOB_FAILURE });
        }
      }
      setIsLoading(false);
    },
    [addError, spaceId]
  );

  return { enableDatafeed, isLoading };
};

const submitTelemetry = (job: SecurityJob, enabled: boolean) => {
  // Report type of job enabled/disabled
  track(
    METRIC_TYPE.COUNT,
    job.isElasticJob
      ? enabled
        ? TELEMETRY_EVENT.SIEM_JOB_ENABLED
        : TELEMETRY_EVENT.SIEM_JOB_DISABLED
      : enabled
      ? TELEMETRY_EVENT.CUSTOM_JOB_ENABLED
      : TELEMETRY_EVENT.CUSTOM_JOB_DISABLED
  );
};
