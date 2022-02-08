/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { roundToDecimalPlace } from '../../../../formatters/round_to_decimal_place';
import { toLocaleString } from '../../../../util/string_utils';
import { timeFormatter } from '../../../../../../common/util/date_utils';

const DATA_FORMAT = '0.0 b';

function formatData(txt) {
  return numeral(txt).format(DATA_FORMAT);
}

export function formatValues(obj) {
  if (!obj) {
    // catch case that formatValues is called without a value.
    // caused by very rare race condition when loading jobs list after deleting a job.
    return ['', ''];
  }

  const [key, value] = obj;

  // time
  switch (key) {
    case 'finished_time':
    case 'create_time':
    case 'log_time':
    case 'timestamp':
    case 'earliest_record_timestamp':
    case 'latest_record_timestamp':
    case 'last_data_time':
    case 'latest_empty_bucket_timestamp':
    case 'latest_sparse_bucket_timestamp':
    case 'latest_bucket_timestamp':
      return [key, timeFormatter(value)];

    // data
    case 'established_model_memory':
    case 'input_bytes':
    case 'model_bytes':
    case 'model_bytes_exceeded':
    case 'model_bytes_memory_limit':
    case 'peak_model_bytes':
      return [key, formatData(value)];

    // numbers
    case 'processed_record_count':
    case 'processed_field_count':
    case 'input_field_count':
    case 'invalid_date_count':
    case 'missing_field_count':
    case 'out_of_order_timestamp_count':
    case 'empty_bucket_count':
    case 'sparse_bucket_count':
    case 'bucket_count':
    case 'input_record_count':
    case 'total_by_field_count':
    case 'total_over_field_count':
    case 'total_partition_field_count':
    case 'bucket_allocation_failures_count':
    case 'search_count':
      return [key, toLocaleString(value)];

    // numbers rounded to 3 decimal places
    case 'average_search_time_per_bucket_ms':
    case 'exponential_average_search_time_per_hour_ms':
    case 'total_bucket_processing_time_ms':
    case 'minimum_bucket_processing_time_ms':
    case 'maximum_bucket_processing_time_ms':
    case 'average_bucket_processing_time_ms':
    case 'exponential_average_bucket_processing_time_ms':
    case 'exponential_average_bucket_processing_time_per_hour_ms':
      return [
        key,
        typeof value === 'number' ? roundToDecimalPlace(value, 3).toLocaleString() : value,
      ];

    // boolean
    case 'managed':
      return [key, value.toString()];

    default:
      return [key, value];
  }
}

// utility function to filter child object and arrays out of the supplied object.
// overrides can be supplied to allow either objects or arrays
// used to remove lists or nested objects from the job config when displaying it in the expanded row
export function filterObjects(obj, allowArrays, allowObjects) {
  return Object.keys(obj)
    .filter(
      (k) => allowObjects || typeof obj[k] !== 'object' || (allowArrays && Array.isArray(obj[k]))
    )
    .map((k) => {
      let item = obj[k];
      if (Array.isArray(item)) {
        item = item.join(', ');
      } else if (typeof obj[k] === 'object') {
        item = JSON.stringify(item);
      }
      return [k, item];
    });
}
