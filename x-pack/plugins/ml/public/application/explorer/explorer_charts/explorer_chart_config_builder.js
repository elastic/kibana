/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Builds the configuration object used to plot a chart showing where the anomalies occur in
 * the raw data in the Explorer dashboard.
 */

import { parseInterval } from '../../../../common/util/parse_interval';
import { getEntityFieldList } from '../../../../common/util/anomaly_utils';
import { buildConfigFromDetector } from '../../util/chart_config_builder';
import { mlJobService } from '../../services/job_service';
import { mlFunctionToESAggregation } from '../../../../common/util/job_utils';
import { ML_JOB_AGGREGATION } from '../../../../common/constants/aggregation_types';

// Builds the chart configuration for the provided anomaly record, returning
// an object with properties used for the display (series function and field, aggregation interval etc),
// and properties for the datafeed used for the job (indices, time field etc).
export function buildConfig(record) {
  const job = mlJobService.getJob(record.job_id);
  const detectorIndex = record.detector_index;
  const config = buildConfigFromDetector(job, detectorIndex);

  // Add extra properties used by the explorer dashboard charts.
  config.functionDescription = record.function_description;
  config.bucketSpanSeconds = parseInterval(job.analysis_config.bucket_span).asSeconds();

  config.detectorLabel = record.function;
  if (
    mlJobService.detectorsByJob[record.job_id] !== undefined &&
    detectorIndex < mlJobService.detectorsByJob[record.job_id].length
  ) {
    config.detectorLabel =
      mlJobService.detectorsByJob[record.job_id][detectorIndex].detector_description;
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
  config.entityFields = getEntityFieldList(record);

  if (record.function === ML_JOB_AGGREGATION.METRIC) {
    config.metricFunction = mlFunctionToESAggregation(record.function_description);
  }

  // Build the tooltip data for the chart info icon, showing further details on what is being plotted.
  let functionLabel = config.metricFunction;
  if (config.metricFieldName !== undefined) {
    functionLabel += ` ${config.metricFieldName}`;
  }

  config.infoTooltip = {
    jobId: record.job_id,
    aggregationInterval: config.interval,
    chartFunction: functionLabel,
    entityFields: config.entityFields.map((f) => ({
      fieldName: f.fieldName,
      fieldValue: f.fieldValue,
    })),
  };

  return config;
}
