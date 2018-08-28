/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Formatter for 'typical' and 'actual' values from machine learning results.
 * For detectors which use the time_of_week or time_of_day
 * functions, the filter converts the raw number, which is the number of seconds since
 * midnight, into a human-readable date/time format.
 */

import moment from 'moment';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');


const SIGFIGS_IF_ROUNDING = 3;  // Number of sigfigs to use for values < 10

// Formats the value of an actual or typical field from a machine learning anomaly record.
// mlFunction is the 'function' field from the ML record containing what the user entered e.g. 'high_count',
// (as opposed to the 'function_description' field which holds an ML-built display hint for the function e.g. 'count'.
export function formatValue(value, mlFunction, fieldFormat) {
  // actual and typical values in anomaly record results will be arrays.
  // Unless the array is multi-valued (as it will be for multi-variate analyses such as lat_long),
  // simply return the formatted single value.
  if (Array.isArray(value)) {
    if (value.length === 1) {
      return formatSingleValue(value[0], mlFunction, fieldFormat);
    } else {
      // Return with array style formatting.
      const values = value.map(val => formatSingleValue(val, mlFunction, fieldFormat));
      return `[${values}]`;
    }
  } else {
    return formatSingleValue(value, mlFunction, fieldFormat);
  }
}

// Formats a single value according to the specified ML function.
// If a Kibana fieldFormat is not supplied, will fall back to default
// formatting depending on the magnitude of the value.
function formatSingleValue(value, mlFunction, fieldFormat) {
  if (value === undefined || value === null) {
    return '';
  }

  // If the analysis function is time_of_week/day, format as day/time.
  if (mlFunction === 'time_of_week') {
    const d = new Date();
    const i = parseInt(value);
    d.setTime(i * 1000);
    return moment(d).format('ddd hh:mm');
  } else if (mlFunction === 'time_of_day') {
    const d = new Date();
    const i = parseInt(value);
    d.setTime(i * 1000);
    return moment(d).format('hh:mm');
  } else {
    if (fieldFormat !== undefined) {
      return fieldFormat.convert(value, 'text');
    } else {
      // If no Kibana FieldFormat object provided,
      // format the value depending on its magnitude.
      const absValue = Math.abs(value);
      if (absValue >= 10000 ||  absValue === Math.floor(absValue)) {
        // Output 0 decimal places if whole numbers or >= 10000
        if (fieldFormat !== undefined) {
          return fieldFormat.convert(value, 'text');
        } else {
          return Number(value.toFixed(0));
        }

      } else if (absValue >= 10) {
        // Output to 1 decimal place between 10 and 10000
        return Number(value.toFixed(1));
      }
      else {
        // For values < 10, output to 3 significant figures
        let multiple;
        if (value > 0) {
          multiple = Math.pow(10, SIGFIGS_IF_ROUNDING - Math.floor(Math.log(value) / Math.LN10) - 1);
        } else {
          multiple = Math.pow(10, SIGFIGS_IF_ROUNDING - Math.floor(Math.log(-1 * value) / Math.LN10) - 1);
        }
        return (Math.round(value * multiple)) / multiple;
      }
    }
  }
}

// TODO - remove the filter once all uses of the formatValue Angular filter have been removed.
module.filter('formatValue', () => formatValue);

