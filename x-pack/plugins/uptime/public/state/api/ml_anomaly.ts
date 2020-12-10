/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { apiService } from './utils';
import { AnomalyRecords, AnomalyRecordsParams } from '../actions';
import { API_URLS, ML_MODULE_ID } from '../../../common/constants';
import {
  DataRecognizerConfigRequest,
  DataRecognizerConfigResponse,
  JobExistResult,
  MlCapabilitiesResponse,
} from '../../../../../plugins/ml/public';
import {
  CreateMLJobSuccess,
  DeleteJobResults,
  HeartbeatIndicesParam,
  MonitorIdParam,
} from '../actions/types';
import { getJobPrefix, getMLJobId } from '../../../common/lib/ml';
import { TimeRange } from '../../components/monitor/ml/job_config/job_config';

export const getMLCapabilities = async (): Promise<MlCapabilitiesResponse> => {
  return await apiService.get(API_URLS.ML_CAPABILITIES);
};

export const getExistingJobs = async (): Promise<JobExistResult> => {
  return await apiService.get(API_URLS.ML_MODULE_JOBS + ML_MODULE_ID);
};
export type NewMLJobParams = MonitorIdParam &
  HeartbeatIndicesParam & { timeRange: TimeRange; bucketSpan: string };

export const createMLJob = async ({
  monitorId,
  bucketSpan,
  timeRange,
  heartbeatIndices,
}: NewMLJobParams): Promise<CreateMLJobSuccess | null> => {
  const url = API_URLS.ML_SETUP_MODULE + ML_MODULE_ID;

  const data: Omit<DataRecognizerConfigRequest, 'moduleId'> = {
    prefix: `${getJobPrefix(monitorId)}`,
    useDedicatedIndex: false,
    startDatafeed: true,
    start: timeRange.start,
    end: timeRange.end,
    indexPatternName: heartbeatIndices,
    applyToAllSpaces: true,
    jobOverrides: [{ analysis_config: { bucket_span: bucketSpan } as any }],
    query: {
      bool: {
        filter: [
          { term: { 'monitor.id': monitorId } },
          { range: { 'monitor.duration.us': { gt: 0 } } },
        ],
      },
    },
  };

  const response: DataRecognizerConfigResponse = await apiService.post(url, data);
  if (response?.jobs?.[0]?.id === getMLJobId(monitorId)) {
    const jobResponse = response.jobs[0];
    if (jobResponse.success) {
      return {
        count: 1,
        jobId: jobResponse.id,
      };
    } else {
      const { error } = jobResponse;
      throw new Error(error?.msg);
    }
  } else {
    return null;
  }
};

export const deleteMLJob = async ({ monitorId }: MonitorIdParam): Promise<DeleteJobResults> => {
  const data = { jobIds: [getMLJobId(monitorId)] };

  return await apiService.post(API_URLS.ML_DELETE_JOB, data);
};

export const fetchAnomalyRecords = async ({
  dateStart,
  dateEnd,
  listOfMonitorIds,
  anomalyThreshold,
}: AnomalyRecordsParams): Promise<AnomalyRecords> => {
  const data = {
    jobIds: listOfMonitorIds.map((monitorId: string) => getMLJobId(monitorId)),
    criteriaFields: [],
    influencers: [],
    aggregationInterval: 'auto',
    threshold: anomalyThreshold ?? 25,
    earliestMs: dateStart,
    latestMs: dateEnd,
    dateFormatTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    maxRecords: 500,
    maxExamples: 10,
  };
  return apiService.post(API_URLS.ML_ANOMALIES_RESULT, data);
};

export async function getTimeFieldRange(heartbeatIndices: string, monitorId: string) {
  return apiService.post('/api/ml/fields_service/time_field_range', {
    index: heartbeatIndices,
    timeFieldName: '@timestamp',
    query: {
      bool: {
        filter: [{ term: { 'monitor.id': monitorId } }],
      },
    },
  });
}

export async function getBucketSpanEstimate(timeRange: TimeRange, monitorId: string) {
  return apiService.post('/api/ml/validate/estimate_bucket_span', {
    aggTypes: ['avg'],
    duration: { start: timeRange.start, end: timeRange.end ?? moment().valueOf() },
    fields: ['monitor.duration.us'],
    index: 'heartbeat-*',
    query: { bool: { filter: [{ term: { 'monitor.id': monitorId } }] } },
    timeField: '@timestamp',
  });
}
