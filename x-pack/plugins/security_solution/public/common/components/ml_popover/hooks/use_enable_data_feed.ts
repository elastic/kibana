/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../lib/telemetry';
import { setupMlJob, startDatafeeds, stopDatafeeds } from '../api';
import type { SecurityJob } from '../types';
import * as i18n from './translations';

function mlPopoverReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading': {
      return {
        ...state,
        isLoading: true,
      };
    }
    case 'success': {
      return {
        ...state,
        isLoading: false,
      };
    }
    case 'failure': {
      return {
        ...state,
        isLoading: false,
      };
    }
    default:
      return state;
  }
}

const initialState: State = {
  isLoading: false,
};

interface State {
  isLoading: boolean;
}

type Action = { type: 'loading' } | { type: 'success' } | { type: 'failure' };

// Enable/Disable Job & Datafeed -- passed to JobsTable for use as callback on JobSwitch
export const useEnableDataFeed = () => {
  const { addError } = useAppToasts();
  const [{ isLoading }, dispatch] = useReducer(mlPopoverReducer, initialState);

  const enableDatafeed = async (job: SecurityJob, latestTimestampMs: number, enable: boolean) => {
    submitTelemetry(job, enable);

    if (!job.isInstalled) {
      dispatch({ type: 'loading' });
      try {
        await setupMlJob({
          configTemplate: job.moduleId,
          indexPatternName: job.defaultIndexPattern,
          jobIdErrorFilter: [job.id],
          groups: job.groups,
        });
        dispatch({ type: 'success' });
      } catch (error) {
        addError(error, { title: i18n.CREATE_JOB_FAILURE });
        dispatch({ type: 'failure' });
        return;
      }
    }

    // Max start time for job is no more than two weeks ago to ensure job performance
    const date = new Date();
    const maxStartTime = date.setDate(date.getDate() - 14);

    dispatch({ type: 'loading' });
    if (enable) {
      const startTime = Math.max(latestTimestampMs, maxStartTime);
      try {
        await startDatafeeds({ datafeedIds: [`datafeed-${job.id}`], start: startTime });
        dispatch({ type: 'success' });
      } catch (error) {
        track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_ENABLE_FAILURE);
        addError(error, { title: i18n.START_JOB_FAILURE });
        dispatch({ type: 'failure' });
      }
    } else {
      try {
        await stopDatafeeds({ datafeedIds: [`datafeed-${job.id}`] });
        dispatch({ type: 'success' });
      } catch (error) {
        track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_DISABLE_FAILURE);
        addError(error, { title: i18n.STOP_JOB_FAILURE });
        dispatch({ type: 'failure' });
      }
    }
  };

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
