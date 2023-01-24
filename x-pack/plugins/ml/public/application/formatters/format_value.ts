/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Formatter for 'typical' and 'actual' values from machine learning results.
 * For detectors which use the time_of_week or time_of_day
 * functions, the filter converts the raw number, which is the number of seconds since
 * midnight, into a human-readable date/time format.
 */

import moment from 'moment';
import { AnomalyRecordDoc } from '../../../common/types/anomalies';
const SIGFIGS_IF_ROUNDING = 3; // Number of sigfigs to use for values < 10

// Formats the value of an actual or typical field from a machine learning anomaly record.
// mlFunction is the 'function' field from the ML record containing what the user entered e.g. 'high_count',
// (as opposed to the 'function_description' field which holds an ML-built display hint for the function e.g. 'count'.
// If a Kibana fieldFormat is not supplied, will fall back to default
// formatting depending on the magnitude of the value.
// For time_of_day or time_of_week functions the anomaly record
// containing the timestamp of the anomaly should be supplied in
// order to correctly format the day or week offset to the time of the anomaly.
export function formatValue(
  value: number[] | number,
  mlFunction: string,
  fieldFormat?: any,
  record?: AnomalyRecordDoc
) {
  // actual and typical values in anomaly record results will be arrays.
  // Unless the array is multi-valued (as it will be for multi-variate analyses such as lat_long),
  // simply return the formatted single value.
  if (Array.isArray(value)) {
    if (value.length === 1) {
      return formatSingleValue(value[0], mlFunction, fieldFormat, record);
    } else {
      // Currently only multi-value response is for lat_long detectors.
      // Return with array style formatting, with items formatted as numbers, rather than
      // the default String format which is set for geo_point and geo_shape fields.
      const values = value.map((val) => formatSingleValue(val, mlFunction, undefined, record));
      return `[${values}]`;
    }
  } else {
    return formatSingleValue(value, mlFunction, fieldFormat, record);
  }
}

// Formats a single value according to the specified ML function.
// If a Kibana fieldFormat is not supplied, will fall back to default
// formatting depending on the magnitude of the value.
// For time_of_day or time_of_week functions the anomaly record
// containing the timestamp of the anomaly should be supplied in
// order to correctly format the day or week offset to the time of the anomaly.
export function formatSingleValue(
  value: number,
  mlFunction?: string,
  fieldFormat?: any,
  record?: AnomalyRecordDoc
) {
  if (value === undefined || value === null) {
    return '';
  }

  if (mlFunction === 'time_of_week') {
    const date =
      record !== undefined && record.timestamp !== undefined
        ? new Date(record.timestamp)
        : new Date();
    /**
     * For time_of_week we model "time in UTC" modulo "duration of week in seconds".
     * This means the numbers we output from the backend are seconds after a whole number of weeks after 1/1/1970 in UTC.
     */
    const remainder = moment(date).unix() % moment.duration(1, 'week').asSeconds();
    const offset = moment.duration(remainder, 'seconds');
    const utcMoment = moment.utc(date).subtract(offset).startOf('day').add(value, 's');
    return moment(utcMoment.valueOf()).format('ddd HH:mm');
  } else if (mlFunction === 'time_of_day') {
    /**
     * For time_of_day, actual / typical is the UTC offset in seconds from the
     * start of the day, so need to manipulate to UTC moment of the start of the day
     * that the anomaly occurred using record timestamp if supplied, add on the offset, and finally
     * revert to configured timezone for formatting.
     */
    const d =
      record !== undefined && record.timestamp !== undefined
        ? new Date(record.timestamp)
        : new Date();
    const utcMoment = moment.utc(d).startOf('day').add(value, 's');
    return moment(utcMoment.valueOf()).format('HH:mm');
  } else {
    if (fieldFormat !== undefined) {
      return fieldFormat.convert(value, 'text');
    } else {
      // If no Kibana FieldFormat object provided,
      // format the value depending on its magnitude.
      const absValue = Math.abs(value);
      if (absValue >= 10000 || absValue === Math.floor(absValue)) {
        // Output 0 decimal places if whole numbers or >= 10000
        if (fieldFormat !== undefined) {
          return fieldFormat.convert(value, 'text');
        } else {
          return Number(value.toFixed(0));
        }
      } else if (absValue >= 10) {
        // Output to 1 decimal place between 10 and 10000
        return Number(value.toFixed(1));
      } else {
        // For values < 10, output to 3 significant figures
        let multiple;
        if (value > 0) {
          multiple = Math.pow(
            10,
            SIGFIGS_IF_ROUNDING - Math.floor(Math.log(value) / Math.LN10) - 1
          );
        } else {
          multiple = Math.pow(
            10,
            SIGFIGS_IF_ROUNDING - Math.floor(Math.log(-1 * value) / Math.LN10) - 1
          );
        }
        return Math.round(value * multiple) / multiple;
      }
    }
  }
}
