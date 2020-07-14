/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Contains functions for operations commonly performed on anomaly data
 * to extract information for display in dashboards.
 */

import { i18n } from '@kbn/i18n';
import { CONDITIONS_NOT_SUPPORTED_FUNCTIONS } from '../constants/detector_rule';
import { MULTI_BUCKET_IMPACT } from '../constants/multi_bucket_impact';
import { ANOMALY_SEVERITY, ANOMALY_THRESHOLD } from '../constants/anomalies';
import { AnomalyRecordDoc } from '../types/anomalies';

export interface SeverityType {
  id: ANOMALY_SEVERITY;
  label: string;
}

export enum ENTITY_FIELD_TYPE {
  BY = 'by',
  OVER = 'over',
  PARTITON = 'partition',
}

export interface EntityField {
  fieldName: string;
  fieldValue: string | number | undefined;
  fieldType?: ENTITY_FIELD_TYPE;
}

// List of function descriptions for which actual values from record level results should be displayed.
const DISPLAY_ACTUAL_FUNCTIONS = [
  'count',
  'distinct_count',
  'lat_long',
  'mean',
  'max',
  'min',
  'sum',
  'median',
  'varp',
  'info_content',
  'time',
];

// List of function descriptions for which typical values from record level results should be displayed.
const DISPLAY_TYPICAL_FUNCTIONS = [
  'count',
  'distinct_count',
  'lat_long',
  'mean',
  'max',
  'min',
  'sum',
  'median',
  'varp',
  'info_content',
  'time',
];

let severityTypes: Record<string, SeverityType>;

function getSeverityTypes() {
  if (severityTypes) {
    return severityTypes;
  }

  return (severityTypes = {
    critical: {
      id: ANOMALY_SEVERITY.CRITICAL,
      label: i18n.translate('xpack.ml.anomalyUtils.severity.criticalLabel', {
        defaultMessage: 'critical',
      }),
    },
    major: {
      id: ANOMALY_SEVERITY.MAJOR,
      label: i18n.translate('xpack.ml.anomalyUtils.severity.majorLabel', {
        defaultMessage: 'major',
      }),
    },
    minor: {
      id: ANOMALY_SEVERITY.MINOR,
      label: i18n.translate('xpack.ml.anomalyUtils.severity.minorLabel', {
        defaultMessage: 'minor',
      }),
    },
    warning: {
      id: ANOMALY_SEVERITY.WARNING,
      label: i18n.translate('xpack.ml.anomalyUtils.severity.warningLabel', {
        defaultMessage: 'warning',
      }),
    },
    unknown: {
      id: ANOMALY_SEVERITY.UNKNOWN,
      label: i18n.translate('xpack.ml.anomalyUtils.severity.unknownLabel', {
        defaultMessage: 'unknown',
      }),
    },
    low: {
      id: ANOMALY_SEVERITY.LOW,
      label: i18n.translate('xpack.ml.anomalyUtils.severityWithLow.lowLabel', {
        defaultMessage: 'low',
      }),
    },
  });
}

// Returns a severity label (one of critical, major, minor, warning or unknown)
// for the supplied normalized anomaly score (a value between 0 and 100).
export function getSeverity(normalizedScore: number): SeverityType {
  const severityTypesList = getSeverityTypes();

  if (normalizedScore >= ANOMALY_THRESHOLD.CRITICAL) {
    return severityTypesList.critical;
  } else if (normalizedScore >= ANOMALY_THRESHOLD.MAJOR) {
    return severityTypesList.major;
  } else if (normalizedScore >= ANOMALY_THRESHOLD.MINOR) {
    return severityTypesList.minor;
  } else if (normalizedScore >= ANOMALY_THRESHOLD.LOW) {
    return severityTypesList.warning;
  } else {
    return severityTypesList.unknown;
  }
}

export function getSeverityType(normalizedScore: number): ANOMALY_SEVERITY {
  if (normalizedScore >= 75) {
    return ANOMALY_SEVERITY.CRITICAL;
  } else if (normalizedScore >= 50) {
    return ANOMALY_SEVERITY.MAJOR;
  } else if (normalizedScore >= 25) {
    return ANOMALY_SEVERITY.MINOR;
  } else if (normalizedScore >= 3) {
    return ANOMALY_SEVERITY.WARNING;
  } else if (normalizedScore >= 0) {
    return ANOMALY_SEVERITY.LOW;
  } else {
    return ANOMALY_SEVERITY.UNKNOWN;
  }
}

// Returns a severity label (one of critical, major, minor, warning, low or unknown)
// for the supplied normalized anomaly score (a value between 0 and 100), where scores
// less than 3 are assigned a severity of 'low'.
export function getSeverityWithLow(normalizedScore: number): SeverityType {
  const severityTypesList = getSeverityTypes();

  if (normalizedScore >= ANOMALY_THRESHOLD.CRITICAL) {
    return severityTypesList.critical;
  } else if (normalizedScore >= ANOMALY_THRESHOLD.MAJOR) {
    return severityTypesList.major;
  } else if (normalizedScore >= ANOMALY_THRESHOLD.MINOR) {
    return severityTypesList.minor;
  } else if (normalizedScore >= ANOMALY_THRESHOLD.WARNING) {
    return severityTypesList.warning;
  } else if (normalizedScore >= ANOMALY_THRESHOLD.LOW) {
    return severityTypesList.low;
  } else {
    return severityTypesList.unknown;
  }
}

// Returns a severity RGB color (one of critical, major, minor, warning, low_warning or unknown)
// for the supplied normalized anomaly score (a value between 0 and 100).
export function getSeverityColor(normalizedScore: number): string {
  if (normalizedScore >= ANOMALY_THRESHOLD.CRITICAL) {
    return '#fe5050';
  } else if (normalizedScore >= ANOMALY_THRESHOLD.MAJOR) {
    return '#fba740';
  } else if (normalizedScore >= ANOMALY_THRESHOLD.MINOR) {
    return '#fdec25';
  } else if (normalizedScore >= ANOMALY_THRESHOLD.WARNING) {
    return '#8bc8fb';
  } else if (normalizedScore >= ANOMALY_THRESHOLD.LOW) {
    return '#d2e9f7';
  } else {
    return '#ffffff';
  }
}

// Returns a label to use for the multi-bucket impact of an anomaly
// according to the value of the multi_bucket_impact field of a record,
// which ranges from -5 to +5.
export function getMultiBucketImpactLabel(multiBucketImpact: number): string {
  if (multiBucketImpact >= MULTI_BUCKET_IMPACT.HIGH) {
    return i18n.translate('xpack.ml.anomalyUtils.multiBucketImpact.highLabel', {
      defaultMessage: 'high',
    });
  } else if (multiBucketImpact >= MULTI_BUCKET_IMPACT.MEDIUM) {
    return i18n.translate('xpack.ml.anomalyUtils.multiBucketImpact.mediumLabel', {
      defaultMessage: 'medium',
    });
  } else if (multiBucketImpact >= MULTI_BUCKET_IMPACT.LOW) {
    return i18n.translate('xpack.ml.anomalyUtils.multiBucketImpact.lowLabel', {
      defaultMessage: 'low',
    });
  } else {
    return i18n.translate('xpack.ml.anomalyUtils.multiBucketImpact.noneLabel', {
      defaultMessage: 'none',
    });
  }
}

// Returns the name of the field to use as the entity name from the source record
// obtained from Elasticsearch. The function looks first for a by_field, then over_field,
// then partition_field, returning undefined if none of these fields are present.
export function getEntityFieldName(record: AnomalyRecordDoc): string | undefined {
  // Analyses with by and over fields, will have a top-level by_field_name, but
  // the by_field_value(s) will be in the nested causes array.
  if (record.by_field_name !== undefined && record.by_field_value !== undefined) {
    return record.by_field_name;
  }

  if (record.over_field_name !== undefined) {
    return record.over_field_name;
  }

  if (record.partition_field_name !== undefined) {
    return record.partition_field_name;
  }

  return undefined;
}

// Returns the value of the field to use as the entity value from the source record
// obtained from Elasticsearch. The function looks first for a by_field, then over_field,
// then partition_field, returning undefined if none of these fields are present.
export function getEntityFieldValue(record: AnomalyRecordDoc): string | number | undefined {
  if (record.by_field_value !== undefined) {
    return record.by_field_value;
  }

  if (record.over_field_value !== undefined) {
    return record.over_field_value;
  }

  if (record.partition_field_value !== undefined) {
    return record.partition_field_value;
  }

  return undefined;
}

// Returns the list of partitioning entity fields for the source record as a list
// of objects in the form { fieldName: airline, fieldValue: AAL, fieldType: partition }
export function getEntityFieldList(record: AnomalyRecordDoc): EntityField[] {
  const entityFields: EntityField[] = [];
  if (record.partition_field_name !== undefined) {
    entityFields.push({
      fieldName: record.partition_field_name,
      fieldValue: record.partition_field_value,
      fieldType: ENTITY_FIELD_TYPE.PARTITON,
    });
  }

  if (record.over_field_name !== undefined) {
    entityFields.push({
      fieldName: record.over_field_name,
      fieldValue: record.over_field_value,
      fieldType: ENTITY_FIELD_TYPE.OVER,
    });
  }

  // For jobs with by and over fields, don't add the 'by' field as this
  // field will only be added to the top-level fields for record type results
  // if it also an influencer over the bucket.
  if (record.by_field_name !== undefined && record.over_field_name === undefined) {
    entityFields.push({
      fieldName: record.by_field_name,
      fieldValue: record.by_field_value,
      fieldType: ENTITY_FIELD_TYPE.BY,
    });
  }

  return entityFields;
}

// Returns whether actual values should be displayed for a record with the specified function description.
// Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
// whereas the 'function_description' field holds a ML-built display hint for function e.g. 'count'.
export function showActualForFunction(functionDescription: string): boolean {
  return DISPLAY_ACTUAL_FUNCTIONS.indexOf(functionDescription) > -1;
}

// Returns whether typical values should be displayed for a record with the specified function description.
// Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
// whereas the 'function_description' field holds a ML-built display hint for function e.g. 'count'.
export function showTypicalForFunction(functionDescription: string): boolean {
  return DISPLAY_TYPICAL_FUNCTIONS.indexOf(functionDescription) > -1;
}

// Returns whether a rule can be configured against the specified anomaly.
export function isRuleSupported(record: AnomalyRecordDoc): boolean {
  // A rule can be configured with a numeric condition if the function supports it,
  // and/or with scope if there is a partitioning fields.
  return (
    CONDITIONS_NOT_SUPPORTED_FUNCTIONS.indexOf(record.function) === -1 ||
    getEntityFieldName(record) !== undefined
  );
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
  toES(oldAggType: string): string {
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
  toML(oldAggType: string): string {
    let newAggType = oldAggType;

    if (newAggType === 'avg') {
      newAggType = 'mean';
    } else if (newAggType === 'cardinality') {
      newAggType = 'distinct_count';
    } else if (newAggType === 'percentiles') {
      newAggType = 'median';
    }

    return newAggType;
  },
};
