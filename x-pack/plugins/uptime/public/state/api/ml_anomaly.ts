/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  DataRecognizerConfigResponse,
  JobExistResult,
  MlCapabilitiesResponse,
} from '@kbn/ml-plugin/public';
import { extractErrorMessage } from '@kbn/ml-plugin/common';
import { apiService } from './utils';
import { AnomalyRecords, AnomalyRecordsParams } from '../actions';
import { API_URLS, ML_MODULE_ID } from '../../../common/constants';
import {
  CreateMLJobSuccess,
  DeleteJobResults,
  HeartbeatIndicesParam,
  MonitorIdParam,
} from '../actions/types';
import { getJobPrefix, getMLJobId } from '../../../common/lib/ml';

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
    applyToAllSpaces: true,
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
    const datafeedResponse = response.datafeeds[0];
    if (jobResponse.success) {
      return {
        count: 1,
        jobId: jobResponse.id,
        awaitingNodeAssignment: datafeedResponse.awaitingMlNodeAllocation === true,
      };
    } else {
      const { error } = jobResponse;
      throw new Error(extractErrorMessage(error));
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
