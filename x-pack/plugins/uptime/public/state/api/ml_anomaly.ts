/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { apiService } from './utils';
import { AnomalyRecords, AnomalyRecordsParams } from '../actions';
import { API_URLS, ML_JOB_ID, ML_MODULE_ID } from '../../../common/constants';
import {
  MlCapabilitiesResponse,
  DataRecognizerConfigResponse,
  JobExistResult,
} from '../../../../../plugins/ml/public';
import {
  CreateMLJobSuccess,
  DeleteJobResults,
  MonitorIdParam,
  HeartbeatIndicesParam,
} from '../actions/types';

const getJobPrefix = (monitorId: string) => {
  // ML App doesn't support upper case characters in job name
  // Also Spaces and the characters / ? , " < > | * are not allowed
  // so we will replace all special chars with _

  const prefix = monitorId.replace(/[^A-Z0-9]+/gi, '_').toLowerCase();

  // ML Job ID can't be greater than 64 length, so will be substring it, and hope
  // At such big length, there is minimum chance of having duplicate monitor id
  // Subtracting ML_JOB_ID constant as well
  const postfix = '_' + ML_JOB_ID;

  if ((prefix + postfix).length > 64) {
    return prefix.substring(0, 64 - postfix.length) + '_';
  }
  return prefix + '_';
};

export const getMLJobId = (monitorId: string) => `${getJobPrefix(monitorId)}${ML_JOB_ID}`;

export const getMLCapabilities = async (): Promise<MlCapabilitiesResponse> => {
  return await apiService.get(API_URLS.ML_CAPABILITIES);
};

export const getExistingJobs = async (): Promise<JobExistResult> => {
  return await apiService.get(API_URLS.ML_MODULE_JOBS + ML_MODULE_ID);
};

export const createMLJob = async ({
  monitorId,
  heartbeatIndices,
}: MonitorIdParam & HeartbeatIndicesParam): Promise<CreateMLJobSuccess | null> => {
  const url = API_URLS.ML_SETUP_MODULE + ML_MODULE_ID;

  const data = {
    prefix: `${getJobPrefix(monitorId)}`,
    useDedicatedIndex: false,
    startDatafeed: true,
    start: moment().subtract(2, 'w').valueOf(),
    indexPatternName: heartbeatIndices,
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
