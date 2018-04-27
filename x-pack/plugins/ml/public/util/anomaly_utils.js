/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
* Contains functions for operations commonly performed on anomaly data
* to extract information for display in dashboards.
*/

import _ from 'lodash';

// List of function descriptions for which actual values from record level results should be displayed.
const DISPLAY_ACTUAL_FUNCTIONS = ['count', 'distinct_count', 'lat_long', 'mean', 'max', 'min', 'sum',
  'median', 'varp', 'info_content', 'time'];

// List of function descriptions for which typical values from record level results should be displayed.
const DISPLAY_TYPICAL_FUNCTIONS = ['count', 'distinct_count', 'mean', 'max', 'min', 'sum',
  'median', 'varp', 'info_content', 'time'];

// Returns a severity label (one of critical, major, minor, warning or unknown)
// for the supplied normalized anomaly score (a value between 0 and 100).
export function getSeverity(normalizedScore) {
  if (normalizedScore >= 75) {
    return 'critical';
  } else if (normalizedScore >= 50) {
    return 'major';
  } else if (normalizedScore >= 25) {
    return 'minor';
  } else if (normalizedScore >= 0) {
    return 'warning';
  } else {
    return 'unknown';
  }
}

// Returns a severity label (one of critical, major, minor, warning, low or unknown)
// for the supplied normalized anomaly score (a value between 0 and 100), where scores
// less than 3 are assigned a severity of 'low'.
export function getSeverityWithLow(normalizedScore) {
  if (normalizedScore >= 75) {
    return 'critical';
  } else if (normalizedScore >= 50) {
    return 'major';
  } else if (normalizedScore >= 25) {
    return 'minor';
  } else if (normalizedScore >= 3) {
    return 'warning';
  } else if (normalizedScore >= 0) {
    return 'low';
  } else {
    return 'unknown';
  }
}

// Returns a severity RGB color (one of critical, major, minor, warning, low_warning or unknown)
// for the supplied normalized anomaly score (a value between 0 and 100).
export function getSeverityColor(normalizedScore) {
  if (normalizedScore >= 75) {
    return '#fe5050';
  } else if (normalizedScore >= 50) {
    return '#fba740';
  } else if (normalizedScore >= 25) {
    return '#fdec25';
  } else if (normalizedScore >= 3) {
    return '#8bc8fb';
  } else if (normalizedScore >= 0) {
    return '#d2e9f7';
  } else {
    return '#ffffff';
  }
}

// Recurses through an object holding the list of detector descriptions against job IDs
// checking for duplicate descriptions. For any detectors with duplicate descriptions, the
// description is modified by appending the job ID in parentheses.
// Only checks for duplicates across jobs; any duplicates within a job are left as-is.
export function labelDuplicateDetectorDescriptions(detectorsByJob) {
  const checkedJobIds = [];
  _.each(detectorsByJob, function (detectors, jobId) {
    checkedJobIds.push(jobId);
    const otherJobs = _.omit(detectorsByJob, checkedJobIds);
    _.each(detectors, function (description, i) {
      _.each(otherJobs, function (otherJobDetectors, otherJobId) {
        _.each(otherJobDetectors, function (otherDescription, j) {
          if (description === otherDescription) {
            detectors[i] = description + ' (' + jobId + ')';
            otherJobDetectors[j] = description + ' (' + otherJobId + ')';
          }
        });
      });
    });
  });

  return detectorsByJob;
}

// Returns the name of the field to use as the entity name from the source record
// obtained from Elasticsearch. The function looks first for a by_field, then over_field,
// then partition_field, returning undefined if none of these fields are present.
export function getEntityFieldName(record) {
  // Analyses with by and over fields, will have a top-level by_field_name, but
  // the by_field_value(s) will be in the nested causes array.
  if (_.has(record, 'by_field_name') && _.has(record, 'by_field_value')) {
    return record.by_field_name;
  }

  if (_.has(record, 'over_field_name')) {
    return record.over_field_name;
  }

  if (_.has(record, 'partition_field_name')) {
    return record.partition_field_name;
  }

  return undefined;
}

// Returns the value of the field to use as the entity value from the source record
// obtained from Elasticsearch. The function looks first for a by_field, then over_field,
// then partition_field, returning undefined if none of these fields are present.
export function getEntityFieldValue(record) {
  if (_.has(record, 'by_field_value')) {
    return record.by_field_value;
  }

  if (_.has(record, 'over_field_value')) {
    return record.over_field_value;
  }

  if (_.has(record, 'partition_field_value')) {
    return record.partition_field_value;
  }

  return undefined;
}

// Returns whether actual values should be displayed for a record with the specified function description.
// Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
// whereas the 'function_description' field holds a ML-built display hint for function e.g. 'count'.
export function showActualForFunction(functionDescription) {
  return _.indexOf(DISPLAY_ACTUAL_FUNCTIONS, functionDescription) > -1;
}

// Returns whether typical values should be displayed for a record with the specified function description.
// Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
// whereas the 'function_description' field holds a ML-built display hint for function e.g. 'count'.
export function showTypicalForFunction(functionDescription) {
  return _.indexOf(DISPLAY_TYPICAL_FUNCTIONS, functionDescription) > -1;
}

// Two functions for converting aggregation type names.
// ML and ES use different names for the same function.
// Possible values for ML aggregation type are (defined in lib/model/CAnomalyDetector.cc):
//    count
//    distinct_count
//    rare
//    info_content
//    mean
//    median
//    min
//    max
//    varp
//    sum
//    lat_long
//    time
// The input to toES and the output from toML correspond to the value of the
// function_description field of anomaly records.
export const aggregationTypeTransform = {
  toES: function (oldAggType) {
    let newAggType = oldAggType;

    if (newAggType === 'mean') {
      newAggType = 'avg';
    } else if (newAggType === 'distinct_count') {
      newAggType = 'cardinality';
    } else if (newAggType === 'median') {
      newAggType = 'percentiles';
    }

    return newAggType;
  },
  toML: function (oldAggType) {
    let newAggType = oldAggType;

    if (newAggType === 'avg') {
      newAggType = 'mean';
    } else if (newAggType === 'cardinality') {
      newAggType = 'distinct_count';
    } else if (newAggType === 'percentiles') {
      newAggType = 'median';
    }

    return newAggType;
  }
};
