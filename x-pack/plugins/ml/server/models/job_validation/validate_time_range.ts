/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/server';
import { parseInterval } from '../../../common/util/parse_interval';
import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import { validateJobObject } from './validate_job_object';

interface ValidateTimeRangeMessage {
  id: string;
  timeField?: string;
  minTimeSpanReadable?: string;
  bucketSpanCompareFactor?: number;
}

interface TimeRange {
  start: number;
  end: number;
}

const BUCKET_SPAN_COMPARE_FACTOR = 25;
const MIN_TIME_SPAN_MS = 7200000;
const MIN_TIME_SPAN_READABLE = '2 hours';

export async function isValidTimeField({ asCurrentUser }: IScopedClusterClient, job: CombinedJob) {
  const index = job.datafeed_config.indices.join(',');
  const timeField = job.data_description.time_field!;

  // check if time_field is of type 'date' or 'date_nanos'
  const fieldCaps = await asCurrentUser.fieldCaps({
    index,
    fields: [timeField],
  });

  let fieldType = fieldCaps?.fields[timeField]?.date?.type;
  if (fieldType === undefined) {
    fieldType = fieldCaps?.fields[timeField]?.date_nanos?.type;
  }
  return fieldType === ES_FIELD_TYPES.DATE || fieldType === ES_FIELD_TYPES.DATE_NANOS;
}

export async function validateTimeRange(
  mlClientCluster: IScopedClusterClient,
  job: CombinedJob,
  timeRange?: Partial<TimeRange>
) {
  const messages: ValidateTimeRangeMessage[] = [];

  validateJobObject(job);

  // check if time_field is a date type
  if (!(await isValidTimeField(mlClientCluster, job))) {
    messages.push({
      id: 'time_field_invalid',
      timeField: job.data_description.time_field,
    });
    // if the time field is invalid, skip all other checks
    return messages;
  }

  // if there is no duration, do not run the estimate test
  if (
    typeof timeRange === 'undefined' ||
    typeof timeRange.start === 'undefined' ||
    typeof timeRange.end === 'undefined'
  ) {
    return messages;
  }

  // check if time range is after the Unix epoch start
  if (timeRange.start < 0 || timeRange.end < 0) {
    messages.push({ id: 'time_range_before_epoch' });
  }

  // check for minimum time range (25 buckets or 2 hours, whichever is longer)
  const interval = parseInterval(job.analysis_config.bucket_span, true);
  if (interval === null) {
    messages.push({ id: 'bucket_span_invalid' });
  } else {
    const bucketSpan: number = interval.asMilliseconds();
    const minTimeSpanBasedOnBucketSpan = bucketSpan * BUCKET_SPAN_COMPARE_FACTOR;
    const timeSpan = timeRange.end - timeRange.start;
    const minRequiredTimeSpan = Math.max(MIN_TIME_SPAN_MS, minTimeSpanBasedOnBucketSpan);

    if (minRequiredTimeSpan > timeSpan) {
      messages.push({
        id: 'time_range_short',
        minTimeSpanReadable: MIN_TIME_SPAN_READABLE,
        bucketSpanCompareFactor: BUCKET_SPAN_COMPARE_FACTOR,
      });
    }
  }

  if (messages.length === 0) {
    messages.push({ id: 'success_time_range' });
  }

  return messages;
}
