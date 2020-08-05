/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

const customRulesSchema = schema.maybe(
  schema.arrayOf(
    schema.maybe(
      schema.object({
        actions: schema.arrayOf(schema.string()),
        conditions: schema.arrayOf(schema.any()),
        scope: schema.maybe(schema.any()),
      })
    )
  )
);

const detectorSchema = schema.object({
  identifier: schema.maybe(schema.string()),
  function: schema.string(),
  field_name: schema.maybe(schema.string()),
  by_field_name: schema.maybe(schema.string()),
  over_field_name: schema.maybe(schema.string()),
  partition_field_name: schema.maybe(schema.string()),
  detector_description: schema.maybe(schema.string()),
  /** Custom rules */
  custom_rules: customRulesSchema,
});

const customUrlSchema = {
  url_name: schema.string(),
  url_value: schema.string(),
  time_range: schema.maybe(schema.any()),
};

const customSettingsSchema = schema.object(
  {
    /** Indicates the creator entity */
    created_by: schema.maybe(schema.string()),
    custom_urls: schema.maybe(schema.arrayOf(schema.maybe(schema.object(customUrlSchema)))),
  },
  { unknowns: 'allow' } // Create / Update job API allows other fields to be added to custom_settings.
);

export const anomalyDetectionUpdateJobSchema = schema.object({
  description: schema.maybe(schema.string()),
  detectors: schema.maybe(
    schema.arrayOf(
      schema.maybe(
        schema.object({
          /** Detector index */
          detector_index: schema.number(),
          /** Description */
          description: schema.maybe(schema.string()),
          /** Custom rules */
          custom_rules: customRulesSchema,
        })
      )
    )
  ),
  custom_settings: schema.maybe(customSettingsSchema),
  analysis_limits: schema.maybe(
    schema.object({
      categorization_examples_limit: schema.maybe(schema.number()),
      model_memory_limit: schema.maybe(schema.string()),
    })
  ),
  groups: schema.maybe(schema.arrayOf(schema.maybe(schema.string()))),
  model_snapshot_retention_days: schema.maybe(schema.number()),
  daily_model_snapshot_retention_after_days: schema.maybe(schema.number()),
});

export const analysisConfigSchema = schema.object({
  bucket_span: schema.maybe(schema.string()),
  summary_count_field_name: schema.maybe(schema.string()),
  detectors: schema.arrayOf(detectorSchema),
  influencers: schema.arrayOf(schema.maybe(schema.string())),
  categorization_field_name: schema.maybe(schema.string()),
  per_partition_categorization: schema.maybe(
    schema.object({
      enabled: schema.boolean(),
      stop_on_warn: schema.maybe(schema.boolean()),
    })
  ),
});

export const anomalyDetectionJobSchema = {
  analysis_config: analysisConfigSchema,
  analysis_limits: schema.maybe(
    schema.object({
      /** Limit of categorization examples */
      categorization_examples_limit: schema.maybe(schema.number()),
      model_memory_limit: schema.maybe(schema.string()),
    })
  ),
  background_persist_interval: schema.maybe(schema.string()),
  create_time: schema.maybe(schema.number()),
  custom_settings: schema.maybe(customSettingsSchema),
  allow_lazy_open: schema.maybe(schema.any()),
  data_counts: schema.maybe(schema.any()),
  data_description: schema.object({
    /** Format */
    format: schema.maybe(schema.string()),
    time_field: schema.string(),
    time_format: schema.maybe(schema.string()),
  }),
  datafeed_config: schema.maybe(schema.any()),
  description: schema.maybe(schema.string()),
  established_model_memory: schema.maybe(schema.number()),
  finished_time: schema.maybe(schema.number()),
  job_id: schema.string(),
  job_type: schema.maybe(schema.string()),
  job_version: schema.maybe(schema.string()),
  groups: schema.arrayOf(schema.maybe(schema.string())),
  model_plot_config: schema.maybe(schema.any()),
  model_size_stats: schema.maybe(schema.any()),
  model_snapshot_id: schema.maybe(schema.string()),
  model_snapshot_min_version: schema.maybe(schema.string()),
  model_snapshot_retention_days: schema.maybe(schema.number()),
  daily_model_snapshot_retention_after_days: schema.maybe(schema.number()),
  renormalization_window_days: schema.maybe(schema.number()),
  results_index_name: schema.maybe(schema.string()),
  results_retention_days: schema.maybe(schema.number()),
  state: schema.maybe(schema.string()),
};

export const jobIdSchema = schema.object({
  /** Job ID. */
  jobId: schema.string(),
});

export const getRecordsSchema = schema.object({
  desc: schema.maybe(schema.boolean()),
  end: schema.maybe(schema.string()),
  exclude_interim: schema.maybe(schema.boolean()),
  page: schema.maybe(
    schema.object({
      from: schema.maybe(schema.number()),
      size: schema.maybe(schema.number()),
    })
  ),
  record_score: schema.maybe(schema.number()),
  sort: schema.maybe(schema.string()),
  start: schema.maybe(schema.string()),
});

export const getBucketsSchema = schema.object({
  anomaly_score: schema.maybe(schema.number()),
  desc: schema.maybe(schema.boolean()),
  end: schema.maybe(schema.string()),
  exclude_interim: schema.maybe(schema.boolean()),
  expand: schema.maybe(schema.boolean()),
  /** Page definition */
  page: schema.maybe(
    schema.object({
      /** Page offset */
      from: schema.maybe(schema.number()),
      /** Size of the page */
      size: schema.maybe(schema.number()),
    })
  ),
  sort: schema.maybe(schema.string()),
  start: schema.maybe(schema.string()),
});

export const getBucketParamsSchema = schema.object({
  jobId: schema.string(),
  timestamp: schema.maybe(schema.string()),
});

export const getOverallBucketsSchema = schema.object({
  topN: schema.number(),
  bucketSpan: schema.string(),
  start: schema.number(),
  end: schema.number(),
});

export const getCategoriesSchema = schema.object({
  /** Category ID */
  categoryId: schema.string(),
  /** Job ID */
  jobId: schema.string(),
});

export const getModelSnapshotsSchema = schema.object({
  /** Snapshot ID */
  snapshotId: schema.maybe(schema.string()),
  /** Job ID */
  jobId: schema.string(),
});

export const updateModelSnapshotSchema = schema.object({
  /** description */
  description: schema.maybe(schema.string()),
  /** retain */
  retain: schema.maybe(schema.boolean()),
});

export const forecastAnomalyDetector = schema.object({ duration: schema.any() });
