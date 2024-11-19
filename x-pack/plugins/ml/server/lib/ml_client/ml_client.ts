/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { MLSavedObjectService } from '../../saved_objects';
import { getJobDetailsFromTrainedModel } from '../../saved_objects/util';
import type { JobType } from '../../../common/types/saved_objects';

import type { Job, Datafeed } from '../../../common/types/anomaly_detection_jobs';
import { searchProvider } from './search';

import { MLJobNotFound, MLModelNotFound } from './errors';
import type {
  MlClient,
  MlClientParams,
  MlGetADParams,
  MlGetDFAParams,
  MlGetDatafeedParams,
  MlGetTrainedModelParams,
} from './types';
import type { MlAuditLogger } from './ml_audit_logger';

export function getMlClient(
  client: IScopedClusterClient,
  mlSavedObjectService: MLSavedObjectService,
  auditLogger: MlAuditLogger
): MlClient {
  const mlClient = client.asInternalUser.ml;

  async function jobIdsCheck(jobType: JobType, p: MlClientParams, allowWildcards: boolean = false) {
    const jobIds =
      jobType === 'anomaly-detector' ? getADJobIdsFromRequest(p) : getDFAJobIdsFromRequest(p);
    if (jobIds.length) {
      await checkJobIds(jobType, jobIds, allowWildcards);
    }
  }

  async function checkJobIds(jobType: JobType, jobIds: string[], allowWildcards: boolean = false) {
    const filteredJobIds = await mlSavedObjectService.filterJobIdsForSpace(jobType, jobIds);
    let missingIds = jobIds.filter((j) => filteredJobIds.indexOf(j) === -1);
    if (allowWildcards === true && missingIds.join().match('\\*') !== null) {
      // filter out wildcard ids from the error
      missingIds = missingIds.filter((id) => id.match('\\*') === null);
    }
    if (missingIds.length) {
      throw new MLJobNotFound(`No known job with id '${missingIds.join(',')}'`);
    }
  }

  async function groupIdsCheck(p: MlClientParams, allJobs: Job[], filteredJobIds: string[]) {
    // if job ids have been specified, we need to check in case any of them are actually
    // group ids, which will be unknown to the saved objects.
    // find which ids are not group ids and check them.
    const ids = getADJobIdsFromRequest(p);
    if (ids.length) {
      // find all groups from unfiltered jobs
      const responseGroupIds = [...new Set(allJobs.map((j) => j.groups ?? []).flat())];

      // work out which ids requested are actually groups and which are jobs
      const requestedGroupIds: string[] = [];
      const requestedJobIds: string[] = [];
      ids.forEach((id) => {
        if (responseGroupIds.includes(id)) {
          requestedGroupIds.push(id);
        } else {
          requestedJobIds.push(id);
        }
      });

      // find all groups from filtered jobs
      const groupIdsFromFilteredJobs = [
        ...new Set(
          allJobs
            .filter((j) => filteredJobIds.includes(j.job_id))
            .map((j) => j.groups ?? [])
            .flat()
        ),
      ];

      const groupsIdsThatDidNotMatch = requestedGroupIds.filter(
        (id) => groupIdsFromFilteredJobs.includes(id) === false
      );

      if (groupsIdsThatDidNotMatch.length) {
        // if there are group ids which were requested but didn't
        // exist in filtered jobs, list them in an error
        throw new MLJobNotFound(`No known job with id '${groupsIdsThatDidNotMatch.join(',')}'`);
      }

      // check the remaining jobs ids
      if (requestedJobIds.length) {
        await checkJobIds('anomaly-detector', requestedJobIds, true);
      }
    }
  }

  async function groupIdsCheckFromJobStats(
    filteredJobIds: string[],
    ...p: Parameters<MlClient['getJobStats']>
  ) {
    // similar to groupIdsCheck above, however we need to load the jobs first to get the groups information
    const ids = filterAll(getADJobIdsFromRequest(p));
    if (ids.length) {
      const body = await mlClient.getJobs(...p);
      await groupIdsCheck(p, body.jobs, filteredJobIds);
    }
  }

  async function datafeedIdsCheck(p: MlClientParams, allowWildcards: boolean = false) {
    const datafeedIds = getDatafeedIdsFromRequest(p);
    if (datafeedIds.length) {
      const filteredDatafeedIds = await mlSavedObjectService.filterDatafeedIdsForSpace(datafeedIds);
      let missingIds = datafeedIds.filter((j) => filteredDatafeedIds.indexOf(j) === -1);
      if (allowWildcards === true && missingIds.join().match('\\*') !== null) {
        // filter out wildcard ids from the error
        missingIds = missingIds.filter((id) => id.match('\\*') === null);
      }
      if (missingIds.length) {
        throw new MLJobNotFound(`No known datafeed with id '${missingIds.join(',')}'`);
      }
    }
  }

  async function modelIdsCheck(p: MlClientParams, allowWildcards: boolean = false) {
    const modelIds = filterAll(getModelIdsFromRequest(p));
    if (modelIds.length) {
      await checkModelIds(modelIds, allowWildcards);
    }
  }

  function switchDeploymentId(
    p: Parameters<MlClient['stopTrainedModelDeployment']>
  ): Parameters<MlClient['stopTrainedModelDeployment']> {
    const [params] = p;
    if (params.deployment_id !== undefined) {
      params.model_id = params.deployment_id;
      delete params.deployment_id;
    }
    return p;
  }

  async function checkModelIds(modelIds: string[], allowWildcards: boolean = false) {
    const filteredModelIds = await mlSavedObjectService.filterTrainedModelIdsForSpace(modelIds);
    let missingIds = modelIds.filter((j) => filteredModelIds.indexOf(j) === -1);
    if (allowWildcards === true && missingIds.join().match('\\*') !== null) {
      // filter out wildcard ids from the error
      missingIds = missingIds.filter((id) => id.match('\\*') === null);
    }
    if (missingIds.length) {
      throw new MLModelNotFound(`No known model with id '${missingIds.join(',')}'`);
    }
  }

  // @ts-expect-error promise and TransportRequestPromise are incompatible. missing abort
  return {
    async closeJob(...p: Parameters<MlClient['closeJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return auditLogger.wrapTask(() => mlClient.closeJob(...p), 'ml_close_ad_job', p);
    },
    async deleteCalendar(...p: Parameters<MlClient['deleteCalendar']>) {
      return auditLogger.wrapTask(() => mlClient.deleteCalendar(...p), 'ml_delete_calendar', p);
    },
    async deleteCalendarEvent(...p: Parameters<MlClient['deleteCalendarEvent']>) {
      return auditLogger.wrapTask(
        () => mlClient.deleteCalendarEvent(...p),
        'ml_delete_calendar_event',
        p
      );
    },
    async deleteCalendarJob(...p: Parameters<MlClient['deleteCalendarJob']>) {
      return auditLogger.wrapTask(
        () => mlClient.deleteCalendarJob(...p),
        'ml_delete_calendar_job',
        p
      );
    },
    async deleteDataFrameAnalytics(...p: Parameters<MlClient['deleteDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      const resp = await auditLogger.wrapTask(
        () => mlClient.deleteDataFrameAnalytics(...p),
        'ml_delete_dfa_job',
        p
      );
      // don't delete the job saved object as the real job will not be
      // deleted initially and could still fail.
      return resp;
    },
    async deleteDatafeed(...p: Parameters<MlClient['deleteDatafeed']>) {
      await datafeedIdsCheck(p);
      const [datafeedId] = getDatafeedIdsFromRequest(p);
      const resp = await auditLogger.wrapTask(
        () => mlClient.deleteDatafeed(...p),
        'ml_delete_ad_datafeed',
        p
      );
      if (datafeedId !== undefined) {
        await mlSavedObjectService.deleteDatafeed(datafeedId);
      }
      return resp;
    },
    async deleteExpiredData(...p: Parameters<MlClient['deleteExpiredData']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.deleteExpiredData(...p);
    },
    async deleteFilter(...p: Parameters<MlClient['deleteFilter']>) {
      return auditLogger.wrapTask(() => mlClient.deleteFilter(...p), 'ml_delete_filter', p);
    },
    async deleteForecast(...p: Parameters<MlClient['deleteForecast']>) {
      await jobIdsCheck('anomaly-detector', p);
      return auditLogger.wrapTask(() => mlClient.deleteForecast(...p), 'ml_delete_forecast', p);
    },
    async deleteJob(...p: Parameters<MlClient['deleteJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return auditLogger.wrapTask(() => mlClient.deleteJob(...p), 'ml_delete_ad_job', p);
      // don't delete the job saved object as the real job will not be
      // deleted initially and could still fail.
    },
    async deleteModelSnapshot(...p: Parameters<MlClient['deleteModelSnapshot']>) {
      await jobIdsCheck('anomaly-detector', p);
      return auditLogger.wrapTask(
        () => mlClient.deleteModelSnapshot(...p),
        'ml_delete_model_snapshot',
        p
      );
    },
    async deleteTrainedModel(...p: Parameters<MlClient['deleteTrainedModel']>) {
      await modelIdsCheck(p);
      return auditLogger.wrapTask(
        () => mlClient.deleteTrainedModel(...p),
        'ml_delete_trained_model',
        p
      );
    },
    async estimateModelMemory(...p: Parameters<MlClient['estimateModelMemory']>) {
      return mlClient.estimateModelMemory(...p);
    },
    async evaluateDataFrame(...p: Parameters<MlClient['evaluateDataFrame']>) {
      return mlClient.evaluateDataFrame(...p);
    },
    async explainDataFrameAnalytics(...p: Parameters<MlClient['explainDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      return mlClient.explainDataFrameAnalytics(...p);
    },
    async flushJob(...p: Parameters<MlClient['flushJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.flushJob(...p);
    },
    async forecast(...p: Parameters<MlClient['forecast']>) {
      await jobIdsCheck('anomaly-detector', p);
      return auditLogger.wrapTask(() => mlClient.forecast(...p), 'ml_forecast', p);
    },
    async getBuckets(...p: Parameters<MlClient['getBuckets']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getBuckets(...p);
    },
    async getCalendarEvents(...p: Parameters<MlClient['getCalendarEvents']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getCalendarEvents(...p);
    },
    async getCalendars(...p: Parameters<MlClient['getCalendars']>) {
      const [params, options = {}] = p;
      const meta = options.meta ?? false;
      const response = await mlClient.getCalendars(params, { ...options, meta: true });
      const { jobs: allJobs } = await mlClient.getJobs();
      const allJobIds = allJobs.map((j) => j.job_id);

      // flatten the list of all jobs ids and check which ones are valid
      const calJobIds = [...new Set(response.body.calendars.map((c) => c.job_ids).flat())];
      // find groups by getting the cal job ids which aren't real jobs.
      const groups = calJobIds.filter((j) => allJobIds.includes(j) === false);

      // get list of calendar jobs which are allowed in this space
      const filteredJobIds = await mlSavedObjectService.filterJobIdsForSpace(
        'anomaly-detector',
        calJobIds
      );
      const calendars = response.body.calendars.map((c) => ({
        ...c,
        job_ids: c.job_ids.filter((id) => filteredJobIds.includes(id) || groups.includes(id)),
        total_job_count: calJobIds.length,
      }));

      const enhancedBody = { ...response.body, calendars };

      if (meta) {
        return { ...response, body: enhancedBody };
      } else {
        return enhancedBody;
      }
    },
    async getCategories(...p: Parameters<MlClient['getCategories']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getCategories(...p);
    },
    async getDataFrameAnalytics(...p: Parameters<MlClient['getDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p, true);
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;

        const response = await mlClient.getDataFrameAnalytics(params, { ...options, meta: true });
        const jobs = await mlSavedObjectService.filterJobsForSpace<DataFrameAnalyticsConfig>(
          'data-frame-analytics',
          // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
          response.body.data_frame_analytics,
          'id'
        );

        const enhancedBody = { ...response.body, count: jobs.length, data_frame_analytics: jobs };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error;
      }
    },
    async getDataFrameAnalyticsStats(...p: Parameters<MlClient['getDataFrameAnalyticsStats']>) {
      // this should use DataFrameAnalyticsStats, but needs a refactor to move DataFrameAnalyticsStats to common
      await jobIdsCheck('data-frame-analytics', p, true);
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = (await mlClient.getDataFrameAnalyticsStats(params, {
          ...options,
          meta: true,
        })) as unknown as {
          body: { data_frame_analytics: DataFrameAnalyticsConfig[] };
        };
        const jobs = await mlSavedObjectService.filterJobsForSpace<DataFrameAnalyticsConfig>(
          'data-frame-analytics',
          response.body.data_frame_analytics,
          'id'
        );

        const enhancedBody = { ...response.body, count: jobs.length, data_frame_analytics: jobs };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error;
      }
    },
    async getDatafeedStats(...p: Parameters<MlClient['getDatafeedStats']>) {
      await datafeedIdsCheck(p, true);
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = await mlClient.getDatafeedStats(params, { ...options, meta: true });
        const datafeeds = await mlSavedObjectService.filterDatafeedsForSpace(
          'anomaly-detector',
          response.body.datafeeds,
          'datafeed_id'
        );

        const enhancedBody = { ...response.body, count: datafeeds.length, datafeeds };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error;
      }
    },
    async getDatafeeds(...p: Parameters<MlClient['getDatafeeds']>) {
      await datafeedIdsCheck(p, true);
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = await mlClient.getDatafeeds(params, { ...options, meta: true });
        const datafeeds = await mlSavedObjectService.filterDatafeedsForSpace<Datafeed>(
          'anomaly-detector',
          response.body.datafeeds,
          'datafeed_id'
        );

        const enhancedBody = { ...response.body, count: datafeeds.length, datafeeds };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error;
      }
    },
    async getFilters(...p: Parameters<MlClient['getFilters']>) {
      return mlClient.getFilters(...p);
    },
    async getInfluencers(...p: Parameters<MlClient['getInfluencers']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getInfluencers(...p);
    },
    async getJobStats(...p: Parameters<MlClient['getJobStats']>) {
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = await mlClient.getJobStats(params, { ...options, meta: true });
        const jobs = await mlSavedObjectService.filterJobsForSpace(
          'anomaly-detector',
          response.body.jobs,
          'job_id'
        );
        await groupIdsCheckFromJobStats(
          jobs.map((j) => j.job_id),
          ...p
        );

        const enhancedBody = { ...response.body, count: jobs.length, jobs };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error instanceof MLJobNotFound) {
          throw error;
        }
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error;
      }
    },
    async getJobs(...p: Parameters<MlClient['getJobs']>) {
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = await mlClient.getJobs(params, { ...options, meta: true });
        const jobs = await mlSavedObjectService.filterJobsForSpace<Job>(
          'anomaly-detector',
          response.body.jobs,
          'job_id'
        );
        await groupIdsCheck(
          p,
          response.body.jobs,
          jobs.map((j) => j.job_id)
        );

        const enhancedBody = { ...response.body, count: jobs.length, jobs };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error instanceof MLJobNotFound) {
          throw error;
        }
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error;
      }
    },
    async getModelSnapshots(...p: Parameters<MlClient['getModelSnapshots']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getModelSnapshots(...p);
    },
    async getOverallBuckets(...p: Parameters<MlClient['getOverallBuckets']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getOverallBuckets(...p);
    },
    async getRecords(...p: Parameters<MlClient['getRecords']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getRecords(...p);
    },
    async getTrainedModels(...p: Parameters<MlClient['getTrainedModels']>) {
      await modelIdsCheck(p, true);
      try {
        const body = await mlClient.getTrainedModels(...p);
        const models =
          await mlSavedObjectService.filterTrainedModelsForSpace<estypes.MlTrainedModelConfig>(
            body.trained_model_configs,
            'model_id'
          );
        return { ...body, count: models.length, trained_model_configs: models };
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLModelNotFound(error.body.error.reason);
        }
        throw error;
      }
    },
    async getTrainedModelsStats(...p: Parameters<MlClient['getTrainedModelsStats']>) {
      await modelIdsCheck(p, true);
      try {
        const body = await mlClient.getTrainedModelsStats(...p);
        const models =
          await mlSavedObjectService.filterTrainedModelsForSpace<estypes.MlTrainedModelStats>(
            body.trained_model_stats,
            'model_id'
          );
        return { ...body, count: models.length, trained_model_stats: models };
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLModelNotFound(error.body.error.reason);
        }
        throw error;
      }
    },
    async startTrainedModelDeployment(...p: Parameters<MlClient['startTrainedModelDeployment']>) {
      await modelIdsCheck(p);
      // TODO use mlClient.startTrainedModelDeployment when esClient is updated
      const { model_id: modelId, adaptive_allocations: adaptiveAllocations, ...queryParams } = p[0];
      return auditLogger.wrapTask(
        () =>
          client.asInternalUser.transport.request<estypes.MlStartTrainedModelDeploymentResponse>(
            {
              method: 'POST',
              path: `_ml/trained_models/${modelId}/deployment/_start`,
              ...(isPopulatedObject(queryParams) ? { querystring: queryParams } : {}),
              ...(isPopulatedObject(adaptiveAllocations)
                ? { body: { adaptive_allocations: adaptiveAllocations } }
                : {}),
            },
            p[1]
          ),
        'ml_start_trained_model_deployment',
        p
      );
    },
    async updateTrainedModelDeployment(...p: Parameters<MlClient['updateTrainedModelDeployment']>) {
      await modelIdsCheck(p);

      const { deployment_id: deploymentId, model_id: modelId, ...bodyParams } = p[0];
      // TODO use mlClient.updateTrainedModelDeployment when esClient is updated
      return auditLogger.wrapTask(
        () =>
          client.asInternalUser.transport.request({
            method: 'POST',
            path: `/_ml/trained_models/${deploymentId}/deployment/_update`,
            body: bodyParams,
          }),
        'ml_update_trained_model_deployment',
        p
      );
    },
    async stopTrainedModelDeployment(...p: Parameters<MlClient['stopTrainedModelDeployment']>) {
      await modelIdsCheck(p);
      switchDeploymentId(p);

      return auditLogger.wrapTask(
        () => mlClient.stopTrainedModelDeployment(...p),
        'ml_stop_trained_model_deployment',
        p
      );
    },
    async inferTrainedModel(...p: Parameters<MlClient['inferTrainedModel']>) {
      await modelIdsCheck(p);
      switchDeploymentId(p);
      // Temporary workaround for the incorrect inferTrainedModelDeployment function in the esclient
      if (
        // @ts-expect-error TS complains it's always false
        p.length === 0 ||
        p[0] === undefined
      ) {
        // Temporary generic error message. This should never be triggered
        // but is added for type correctness below
        throw new Error('Incorrect arguments supplied');
      }
      // @ts-expect-error body doesn't exist in the type
      const { model_id: id, body, query: querystring } = p[0];

      return auditLogger.wrapTask(
        () =>
          client.asInternalUser.transport.request(
            {
              method: 'POST',
              path: `/_ml/trained_models/${id}/_infer`,
              body,
              querystring,
            },
            p[1]
          ),
        'ml_infer_trained_model',
        p
      );
    },
    async info(...p: Parameters<MlClient['info']>) {
      return mlClient.info(...p);
    },
    async openJob(...p: Parameters<MlClient['openJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return auditLogger.wrapTask(() => mlClient.openJob(...p), 'ml_open_ad_job', p);
    },
    async postCalendarEvents(...p: Parameters<MlClient['postCalendarEvents']>) {
      return auditLogger.wrapTask(
        () => mlClient.postCalendarEvents(...p),
        'ml_post_calendar_events',
        p
      );
    },
    async previewDatafeed(...p: Parameters<MlClient['previewDatafeed']>) {
      await datafeedIdsCheck(p);
      return mlClient.previewDatafeed(...p);
    },
    async putCalendar(...p: Parameters<MlClient['putCalendar']>) {
      return auditLogger.wrapTask(() => mlClient.putCalendar(...p), 'ml_put_calendar', p);
    },
    async putCalendarJob(...p: Parameters<MlClient['putCalendarJob']>) {
      return auditLogger.wrapTask(() => mlClient.putCalendarJob(...p), 'ml_put_calendar_job', p);
    },
    async putDataFrameAnalytics(...p: Parameters<MlClient['putDataFrameAnalytics']>) {
      const [analyticsId] = getDFAJobIdsFromRequest(p);
      const resp = await auditLogger.wrapTask(
        () => mlClient.putDataFrameAnalytics(...p),
        'ml_put_dfa_job',
        p
      );
      if (analyticsId !== undefined) {
        await mlSavedObjectService.createDataFrameAnalyticsJob(analyticsId);
      }
      return resp;
    },
    async putDatafeed(...p: Parameters<MlClient['putDatafeed']>) {
      const [datafeedId] = getDatafeedIdsFromRequest(p);
      const resp = await auditLogger.wrapTask(
        () => mlClient.putDatafeed(...p),
        'ml_put_ad_datafeed',
        p
      );
      const jobId = getJobIdFromBody(p);
      if (datafeedId !== undefined && jobId !== undefined) {
        await mlSavedObjectService.addDatafeed(datafeedId, jobId);
      }

      return resp;
    },
    async putFilter(...p: Parameters<MlClient['putFilter']>) {
      return auditLogger.wrapTask(() => mlClient.putFilter(...p), 'ml_put_filter', p);
    },
    async putJob(...p: Parameters<MlClient['putJob']>) {
      const [jobId] = getADJobIdsFromRequest(p);
      const resp = await auditLogger.wrapTask(() => mlClient.putJob(...p), 'ml_put_ad_job', p);
      if (jobId !== undefined) {
        await mlSavedObjectService.createAnomalyDetectionJob(jobId);
      }
      return resp;
    },
    async putTrainedModel(...p: Parameters<MlClient['putTrainedModel']>) {
      const resp = await auditLogger.wrapTask(
        () => mlClient.putTrainedModel(...p),
        'ml_put_trained_model',
        p
      );
      const [modelId] = getModelIdsFromRequest(p);
      if (modelId !== undefined) {
        const model = (p[0] as estypes.MlPutTrainedModelRequest).body;
        const job = getJobDetailsFromTrainedModel(model);
        await mlSavedObjectService.createTrainedModel(modelId, job);
      }
      return resp;
    },
    async revertModelSnapshot(...p: Parameters<MlClient['revertModelSnapshot']>) {
      await jobIdsCheck('anomaly-detector', p);
      return auditLogger.wrapTask(
        () => mlClient.revertModelSnapshot(...p),
        'ml_revert_ad_snapshot',
        p
      );
    },
    async setUpgradeMode(...p: Parameters<MlClient['setUpgradeMode']>) {
      return mlClient.setUpgradeMode(...p);
    },
    async startDataFrameAnalytics(...p: Parameters<MlClient['startDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      return auditLogger.wrapTask(
        () => mlClient.startDataFrameAnalytics(...p),
        'ml_start_dfa_job',
        p
      );
    },
    async startDatafeed(...p: Parameters<MlClient['startDatafeed']>) {
      await datafeedIdsCheck(p);
      return auditLogger.wrapTask(() => mlClient.startDatafeed(...p), 'ml_start_ad_datafeed', p);
    },
    async stopDataFrameAnalytics(...p: Parameters<MlClient['stopDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      return auditLogger.wrapTask(
        () => mlClient.stopDataFrameAnalytics(...p),
        'ml_stop_dfa_job',
        p
      );
    },
    async stopDatafeed(...p: Parameters<MlClient['stopDatafeed']>) {
      await datafeedIdsCheck(p);
      return auditLogger.wrapTask(() => mlClient.stopDatafeed(...p), 'ml_stop_ad_datafeed', p);
    },
    async updateDataFrameAnalytics(...p: Parameters<MlClient['updateDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      return auditLogger.wrapTask(
        () => mlClient.updateDataFrameAnalytics(...p),
        'ml_update_dfa_job',
        p
      );
    },
    async updateDatafeed(...p: Parameters<MlClient['updateDatafeed']>) {
      await datafeedIdsCheck(p);
      return auditLogger.wrapTask(() => mlClient.updateDatafeed(...p), 'ml_update_ad_datafeed', p);
    },
    async updateFilter(...p: Parameters<MlClient['updateFilter']>) {
      return auditLogger.wrapTask(() => mlClient.updateFilter(...p), 'ml_update_filter', p);
    },
    async updateJob(...p: Parameters<MlClient['updateJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return auditLogger.wrapTask(() => mlClient.updateJob(...p), 'ml_update_ad_job', p);
    },
    async resetJob(...p: Parameters<MlClient['resetJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return auditLogger.wrapTask(() => mlClient.resetJob(...p), 'ml_reset_ad_job', p);
    },
    async updateModelSnapshot(...p: Parameters<MlClient['updateModelSnapshot']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.updateModelSnapshot(...p);
    },
    async validate(...p: Parameters<MlClient['validate']>) {
      return mlClient.validate(...p);
    },
    async validateDetector(...p: Parameters<MlClient['validateDetector']>) {
      return mlClient.validateDetector(...p);
    },
    async getMemoryStats(...p: Parameters<MlClient['getMemoryStats']>) {
      return mlClient.getMemoryStats(...p);
    },

    ...searchProvider(client, mlSavedObjectService),
  } as MlClient;
}

export function getDFAJobIdsFromRequest([params]: MlGetDFAParams): string[] {
  const ids = params?.id?.split(',');
  return ids || [];
}

export function getModelIdsFromRequest([params]: MlGetTrainedModelParams): string[] {
  const id = params?.model_id;
  const ids = Array.isArray(id) ? id : id?.split(',');
  return ids || [];
}

export function getADJobIdsFromRequest([params]: MlGetADParams): string[] {
  const ids = typeof params?.job_id === 'string' ? params?.job_id.split(',') : params?.job_id;
  return ids || [];
}

export function getDatafeedIdsFromRequest([params]: MlGetDatafeedParams): string[] {
  const ids =
    typeof params?.datafeed_id === 'string' ? params?.datafeed_id.split(',') : params?.datafeed_id;
  return ids || [];
}

export function getJobIdFromBody(p: any): string | undefined {
  const [params] = p;
  return params?.body?.job_id;
}

function filterAll(ids: string[]) {
  // if _all has been passed as the only id, remove it and assume it was
  // an empty list, so all items are returned.
  // if _all is one of many ids, the endpoint should look for
  // something called _all, which will subsequently fail.
  return ids.length === 1 && ids[0] === '_all' ? [] : ids;
}
