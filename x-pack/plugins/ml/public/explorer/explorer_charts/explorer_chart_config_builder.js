/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Builds the configuration object used to plot a chart showing where the anomalies occur in
 * the raw data in the Explorer dashboard.
 */

import _ from 'lodash';

import { parseInterval } from 'ui/utils/parse_interval';
import { buildConfigFromDetector } from '../../util/chart_config_builder';
import { mlEscape } from '../../util/string_utils';
import { mlJobService } from '../../services/job_service';

// Builds the chart configuration for the provided anomaly record, returning
// an object with properties used for the display (series function and field, aggregation interval etc),
// and properties for the data feed used for the job (index pattern, time field etc).
export function buildConfig(record) {
  const job = mlJobService.getJob(record.job_id);
  const detectorIndex = record.detector_index;
  const config = buildConfigFromDetector(job, detectorIndex);

  // Add extra properties used by the explorer dashboard charts.
  config.functionDescription = record.function_description;
  config.bucketSpanSeconds = parseInterval(job.analysis_config.bucket_span).asSeconds();

  config.detectorLabel = record.function;
  if ((_.has(mlJobService.detectorsByJob, record.job_id)) &&
    (detectorIndex < mlJobService.detectorsByJob[record.job_id].length)) {
    config.detectorLabel = mlJobService.detectorsByJob[record.job_id][detectorIndex].detector_description;
  } else {
    if (record.field_name !== undefined) {
      config.detectorLabel += ` ${config.fieldName}`;
    }
  }

  if (record.field_name !== undefined) {
    config.fieldName = record.field_name;
    config.metricFieldName = record.field_name;
  }

  // Add the 'entity_fields' i.e. the partition, by, over fields which
  // define the metric series to be plotted.
  config.entityFields = [];
  if (_.has(record, 'partition_field_name')) {
    config.entityFields.push({
      fieldName: record.partition_field_name,
      fieldValue: record.partition_field_value,
      fieldType: 'partition'
    });
  }

  if (_.has(record, 'over_field_name')) {
    config.entityFields.push({
      fieldName: record.over_field_name,
      fieldValue: record.over_field_value,
      fieldType: 'over'
    });
  }

  // For jobs with by and over fields, don't add the 'by' field as this
  // field will only be added to the top-level fields for record type results
  // if it also an influencer over the bucket.
  if (_.has(record, 'by_field_name') && !(_.has(record, 'over_field_name'))) {
    config.entityFields.push({
      fieldName: record.by_field_name,
      fieldValue: record.by_field_value,
      fieldType: 'by'
    });
  }

  // Build the tooltip data for the chart info icon, showing further details on what is being plotted.
  let functionLabel = config.metricFunction;
  if (config.metricFieldName !== undefined) {
    functionLabel += ` ${mlEscape(config.metricFieldName)}`;
  }

  config.infoTooltip = {
    jobId: record.job_id,
    aggregationInterval: config.interval,
    chartFunction: functionLabel,
    entityFields: config.entityFields.map((f) => ({
      fieldName: mlEscape(f.fieldName),
      fieldValue: mlEscape(f.fieldValue),
    }))
  };

  return config;
}
