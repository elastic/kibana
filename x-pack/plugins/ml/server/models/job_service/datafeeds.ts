/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { IScopedClusterClient } from 'kibana/server';
import { JOB_STATE, DATAFEED_STATE } from '../../../common/constants/states';
import { fillResultsWithTimeouts, isRequestTimeout } from './error_utils';
import { Datafeed, DatafeedStats, Job } from '../../../common/types/anomaly_detection_jobs';
import { ML_DATA_PREVIEW_COUNT } from '../../../common/util/job_utils';
import { fieldsServiceProvider } from '../fields_service';
import type { MlClient } from '../../lib/ml_client';
import { parseInterval } from '../../../common/util/parse_interval';
import { isPopulatedObject } from '../../../common/util/object_utils';

export interface MlDatafeedsResponse {
  datafeeds: Datafeed[];
  count: number;
}
export interface MlDatafeedsStatsResponse {
  datafeeds: DatafeedStats[];
  count: number;
}

interface Results {
  [id: string]: {
    started?: estypes.MlStartDatafeedResponse['started'];
    stopped?: estypes.MlStopDatafeedResponse['stopped'];
    error?: any;
  };
}

export type DatafeedsService = ReturnType<typeof datafeedsProvider>;

export function datafeedsProvider(client: IScopedClusterClient, mlClient: MlClient) {
  async function forceStartDatafeeds(datafeedIds: string[], start?: number, end?: number) {
    const jobIds = await getJobIdsByDatafeedId();
    const doStartsCalled = datafeedIds.reduce((acc, cur) => {
      acc[cur] = false;
      return acc;
    }, {} as { [id: string]: boolean });

    const results: Results = {};

    async function doStart(datafeedId: string): Promise<{ started: boolean; error?: string }> {
      if (doStartsCalled[datafeedId] === false) {
        doStartsCalled[datafeedId] = true;
        try {
          await startDatafeed(datafeedId, start, end);
          return { started: true };
        } catch ({ body }) {
          return { started: false, error: body };
        }
      } else {
        return { started: true };
      }
    }

    for (const datafeedId of datafeedIds) {
      const jobId = jobIds[datafeedId];
      if (jobId !== undefined) {
        try {
          if (await openJob(jobId)) {
            results[datafeedId] = await doStart(datafeedId);
          }
        } catch (error) {
          if (isRequestTimeout(error)) {
            // if the open request times out, start the datafeed anyway
            // then break out of the loop so no more requests are fired.
            // use fillResultsWithTimeouts to add a timeout error to each
            // remaining job
            results[datafeedId] = await doStart(datafeedId);
            return fillResultsWithTimeouts(results, datafeedId, datafeedIds, JOB_STATE.OPENED);
          }
          results[datafeedId] = { started: false, error: error.body };
        }
      } else {
        results[datafeedId] = {
          started: false,
          error: i18n.translate('xpack.ml.models.jobService.jobHasNoDatafeedErrorMessage', {
            defaultMessage: 'Job has no datafeed',
          }),
        };
      }
    }

    return results;
  }

  async function openJob(jobId: string) {
    let opened = false;
    try {
      const { body } = await mlClient.openJob({ job_id: jobId });
      opened = body.opened;
    } catch (error) {
      if (error.statusCode === 409) {
        opened = true;
      } else {
        throw error;
      }
    }
    return opened;
  }

  async function startDatafeed(datafeedId: string, start?: number, end?: number) {
    return mlClient.startDatafeed({
      datafeed_id: datafeedId,
      body: {
        start: start !== undefined ? String(start) : undefined,
        end: end !== undefined ? String(end) : undefined,
      },
    });
  }

  async function stopDatafeeds(datafeedIds: string[]) {
    const results: Results = {};

    for (const datafeedId of datafeedIds) {
      try {
        const { body } = await mlClient.stopDatafeed({
          datafeed_id: datafeedId,
        });
        results[datafeedId] = { stopped: body.stopped };
      } catch (error) {
        if (isRequestTimeout(error)) {
          return fillResultsWithTimeouts(results, datafeedId, datafeedIds, DATAFEED_STATE.STOPPED);
        } else {
          results[datafeedId] = {
            stopped: false,
            error: error.body,
          };
        }
      }
    }

    return results;
  }

  async function forceDeleteDatafeed(datafeedId: string) {
    const { body } = await mlClient.deleteDatafeed<{ acknowledged: boolean }>({
      datafeed_id: datafeedId,
      force: true,
    });
    return body;
  }

  async function getDatafeedIdsByJobId() {
    const {
      body: { datafeeds },
    } = await mlClient.getDatafeeds<MlDatafeedsResponse>();

    return datafeeds.reduce((acc, cur) => {
      acc[cur.job_id] = cur.datafeed_id;
      return acc;
    }, {} as { [id: string]: string });
  }

  async function getJobIdsByDatafeedId() {
    const {
      body: { datafeeds },
    } = await mlClient.getDatafeeds<MlDatafeedsResponse>();

    return datafeeds.reduce((acc, cur) => {
      acc[cur.datafeed_id] = cur.job_id;
      return acc;
    }, {} as { [id: string]: string });
  }

  async function getDatafeedByJobId(
    jobId: string[],
    excludeGenerated?: boolean
  ): Promise<Datafeed[] | undefined>;

  async function getDatafeedByJobId(
    jobId: string,
    excludeGenerated?: boolean
  ): Promise<Datafeed | undefined>;

  async function getDatafeedByJobId(
    jobId: string | string[],
    excludeGenerated?: boolean
  ): Promise<Datafeed | Datafeed[] | undefined> {
    const jobIds = Array.isArray(jobId) ? jobId : [jobId];

    async function findDatafeed() {
      // if the job was doesn't use the standard datafeedId format
      // get all the datafeeds and match it with the jobId
      const {
        body: { datafeeds },
      } = await mlClient.getDatafeeds(excludeGenerated ? { exclude_generated: true } : {});
      if (typeof jobId === 'string') {
        return datafeeds.find((v) => v.job_id === jobId);
      }

      if (Array.isArray(jobId)) {
        return datafeeds.filter((v) => jobIds.includes(v.job_id));
      }
    }
    // if the job was created by the wizard,
    // then we can assume it uses the standard format of the datafeedId
    const assumedDefaultDatafeedId = jobIds.map((v) => `datafeed-${v}`).join(',');
    try {
      const {
        body: { datafeeds: datafeedsResults },
      } = await mlClient.getDatafeeds({
        datafeed_id: assumedDefaultDatafeedId,
        ...(excludeGenerated ? { exclude_generated: true } : {}),
      });
      if (Array.isArray(datafeedsResults)) {
        const result = datafeedsResults.filter((d) => jobIds.includes(d.job_id));

        if (typeof jobId === 'string') {
          if (datafeedsResults.length === 1 && datafeedsResults[0].job_id === jobId) {
            return datafeedsResults[0];
          } else {
            return await findDatafeed();
          }
        }

        if (result.length === jobIds.length) {
          return datafeedsResults;
        } else {
          return await findDatafeed();
        }
      } else {
        return await findDatafeed();
      }
    } catch (e) {
      // if assumedDefaultDatafeedId does not exist, ES will throw an error
      return await findDatafeed();
    }
  }

  async function datafeedPreview(job: Job, datafeed: Datafeed) {
    let query: any = { match_all: {} };
    if (datafeed.query) {
      query = datafeed.query;
    }
    const { getTimeFieldRange } = fieldsServiceProvider(client);
    const { start } = await getTimeFieldRange(
      datafeed.indices,
      job.data_description.time_field,
      query,
      datafeed.runtime_mappings,
      datafeed.indices_options
    );

    // Get bucket span
    // Get first doc time for datafeed
    // Create a new query - must user query and must range query.
    // Time range 'to' first doc time plus < 10 buckets

    // Do a preliminary search to get the date of the earliest doc matching the
    // query in the datafeed. This will be used to apply a time range criteria
    // on the datafeed search preview.
    // This time filter is required for datafeed searches using aggregations to ensure
    // the search does not create too many buckets (default 10000 max_bucket limit),
    // but apply it to searches without aggregations too for consistency.
    const bucketSpan = parseInterval(job.analysis_config.bucket_span);
    if (bucketSpan === null) {
      return;
    }
    const earliestMs = start.epoch;
    const latestMs = +start.epoch + 10 * bucketSpan.asMilliseconds();

    const body: any = {
      query: {
        bool: {
          must: [
            {
              range: {
                [job.data_description.time_field]: {
                  gte: earliestMs,
                  lt: latestMs,
                  format: 'epoch_millis',
                },
              },
            },
            query,
          ],
        },
      },
    };

    // if aggs or aggregations is set, add it to the search
    const aggregations = datafeed.aggs ?? datafeed.aggregations;
    if (isPopulatedObject(aggregations)) {
      body.size = 0;
      body.aggregations = aggregations;

      // add script_fields if present
      const scriptFields = datafeed.script_fields;
      if (isPopulatedObject(scriptFields)) {
        body.script_fields = scriptFields;
      }

      // add runtime_mappings if present
      const runtimeMappings = datafeed.runtime_mappings;
      if (isPopulatedObject(runtimeMappings)) {
        body.runtime_mappings = runtimeMappings;
      }
    } else {
      // if aggregations is not set and retrieveWholeSource is not set, add all of the fields from the job
      body.size = ML_DATA_PREVIEW_COUNT;

      // add script_fields if present
      const scriptFields = datafeed.script_fields;
      if (isPopulatedObject(scriptFields)) {
        body.script_fields = scriptFields;
      }

      // add runtime_mappings if present
      const runtimeMappings = datafeed.runtime_mappings;
      if (isPopulatedObject(runtimeMappings)) {
        body.runtime_mappings = runtimeMappings;
      }

      const fields = new Set<string>();

      // get fields from detectors
      if (job.analysis_config.detectors) {
        job.analysis_config.detectors.forEach((dtr) => {
          if (dtr.by_field_name) {
            fields.add(dtr.by_field_name);
          }
          if (dtr.field_name) {
            fields.add(dtr.field_name);
          }
          if (dtr.over_field_name) {
            fields.add(dtr.over_field_name);
          }
          if (dtr.partition_field_name) {
            fields.add(dtr.partition_field_name);
          }
        });
      }

      // get fields from influencers
      if (job.analysis_config.influencers) {
        job.analysis_config.influencers.forEach((inf) => {
          fields.add(inf);
        });
      }

      // get fields from categorizationFieldName
      if (job.analysis_config.categorization_field_name) {
        fields.add(job.analysis_config.categorization_field_name);
      }

      // get fields from summary_count_field_name
      if (job.analysis_config.summary_count_field_name) {
        fields.add(job.analysis_config.summary_count_field_name);
      }

      // get fields from time_field
      if (job.data_description.time_field) {
        fields.add(job.data_description.time_field);
      }

      // add runtime fields
      if (runtimeMappings) {
        Object.keys(runtimeMappings).forEach((fieldName) => {
          fields.add(fieldName);
        });
      }

      const fieldsList = [...fields];
      if (fieldsList.length) {
        body.fields = fieldsList;
        body._source = false;
      }
    }
    const data = {
      index: datafeed.indices,
      body,
      ...(datafeed.indices_options ?? {}),
    };

    return (await client.asCurrentUser.search(data)).body;
  }

  return {
    forceStartDatafeeds,
    stopDatafeeds,
    forceDeleteDatafeed,
    getDatafeedIdsByJobId,
    getJobIdsByDatafeedId,
    getDatafeedByJobId,
    datafeedPreview,
  };
}
