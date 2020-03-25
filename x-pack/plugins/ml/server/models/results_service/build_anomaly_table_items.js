/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import moment from 'moment-timezone';

import {
  getEntityFieldName,
  getEntityFieldValue,
  showActualForFunction,
  showTypicalForFunction,
} from '../../../common/util/anomaly_utils';

// Builds the items for display in the anomalies table from the supplied list of anomaly records.
// Provide the timezone to use for aggregating anomalies (by day or hour) as set in the
// Kibana dateFormat:tz setting.
export function buildAnomalyTableItems(anomalyRecords, aggregationInterval, dateFormatTz) {
  // Aggregate the anomaly records if necessary, and create skeleton display records with
  // time, detector (description) and source record properties set.
  let displayRecords = [];
  if (aggregationInterval !== 'second') {
    displayRecords = aggregateAnomalies(anomalyRecords, aggregationInterval, dateFormatTz);
  } else {
    // Show all anomaly records.
    displayRecords = anomalyRecords.map(record => {
      return {
        time: record.timestamp,
        source: record,
      };
    });
  }

  // Fill out the remaining properties in each display record
  // for the columns to be displayed in the table.
  const time = new Date().getTime();
  return displayRecords.map((record, index) => {
    const source = record.source;
    const jobId = source.job_id;

    // Identify each row with a unique ID which is used by the table for row expansion.
    record.rowId = `${time}_${index}`;

    record.jobId = jobId;
    record.detectorIndex = source.detector_index;
    record.severity = source.record_score;

    const entityName = getEntityFieldName(source);
    if (entityName !== undefined) {
      record.entityName = entityName;
      record.entityValue = getEntityFieldValue(source);
    }

    if (source.influencers !== undefined) {
      const influencers = [];
      const sourceInfluencers = _.sortBy(source.influencers, 'influencer_field_name');
      sourceInfluencers.forEach(influencer => {
        const influencerFieldName = influencer.influencer_field_name;
        influencer.influencer_field_values.forEach(influencerFieldValue => {
          influencers.push({
            [influencerFieldName]: influencerFieldValue,
          });
        });
      });
      record.influencers = influencers;
    }

    // Add fields to the display records for the actual and typical values.
    // To ensure sorting in the EuiTable works correctly, add extra 'sort'
    // properties which are single numeric values rather than the underlying arrays.
    // These properties can be removed if EuiTable sorting logic can be customized
    // - see https://github.com/elastic/eui/issues/425
    const functionDescription = source.function_description || '';
    const causes = source.causes || [];
    if (showActualForFunction(functionDescription) === true) {
      if (source.actual !== undefined) {
        record.actual = source.actual;
        record.actualSort = getMetricSortValue(source.actual);
      } else {
        // If only a single cause, copy values to the top level.
        if (causes.length === 1) {
          record.actual = causes[0].actual;
          record.actualSort = getMetricSortValue(causes[0].actual);
        }
      }
    }
    if (showTypicalForFunction(functionDescription) === true) {
      if (source.typical !== undefined) {
        record.typical = source.typical;
        record.typicalSort = getMetricSortValue(source.typical);
      } else {
        // If only a single cause, copy values to the top level.
        if (causes.length === 1) {
          record.typical = causes[0].typical;
          record.typicalSort = getMetricSortValue(causes[0].typical);
        }
      }
    }

    // Add a sortable property for the magnitude of the factor by
    // which the actual value is different from the typical.
    if (
      Array.isArray(record.actual) &&
      record.actual.length === 1 &&
      Array.isArray(record.typical) &&
      record.typical.length === 1
    ) {
      const actualVal = Number(record.actual[0]);
      const typicalVal = Number(record.typical[0]);
      record.metricDescriptionSort =
        actualVal > typicalVal ? actualVal / typicalVal : typicalVal / actualVal;
    }

    return record;
  });
}

function aggregateAnomalies(anomalyRecords, interval, dateFormatTz) {
  // Aggregate the anomaly records by time, jobId, detectorIndex, and entity (by/over/partition).
  // anomalyRecords assumed to be supplied in ascending time order.
  if (anomalyRecords.length === 0) {
    return [];
  }

  const aggregatedData = {};
  anomalyRecords.forEach(record => {
    // Use moment.js to get start of interval.
    const roundedTime =
      dateFormatTz !== undefined
        ? moment(record.timestamp)
            .tz(dateFormatTz)
            .startOf(interval)
            .valueOf()
        : moment(record.timestamp)
            .startOf(interval)
            .valueOf();
    if (aggregatedData[roundedTime] === undefined) {
      aggregatedData[roundedTime] = {};
    }

    // Aggregate by job, then detectorIndex.
    const jobId = record.job_id;
    const jobsAtTime = aggregatedData[roundedTime];
    if (jobsAtTime[jobId] === undefined) {
      jobsAtTime[jobId] = {};
    }

    // Aggregate by detector - default to function_description if no description available.
    const detectorIndex = record.detector_index;
    const detectorsForJob = jobsAtTime[jobId];
    if (detectorsForJob[detectorIndex] === undefined) {
      detectorsForJob[detectorIndex] = {};
    }

    // Now add an object for the anomaly with the highest anomaly score per entity.
    // For the choice of entity, look in order for byField, overField, partitionField.
    // If no by/over/partition, default to an empty String.
    const entitiesForDetector = detectorsForJob[detectorIndex];

    // TODO - are we worried about different byFields having the same
    // value e.g. host=server1 and machine=server1?
    let entity = getEntityFieldValue(record);
    if (entity === undefined) {
      entity = '';
    }
    if (entitiesForDetector[entity] === undefined) {
      entitiesForDetector[entity] = record;
    } else {
      if (record.record_score > entitiesForDetector[entity].record_score) {
        entitiesForDetector[entity] = record;
      }
    }
  });

  // Flatten the aggregatedData to give a list of records with
  // the highest score per bucketed time / jobId / detectorIndex.
  const summaryRecords = [];
  _.each(aggregatedData, (times, roundedTime) => {
    _.each(times, jobIds => {
      _.each(jobIds, entityDetectors => {
        _.each(entityDetectors, record => {
          summaryRecords.push({
            time: +roundedTime,
            source: record,
          });
        });
      });
    });
  });

  return summaryRecords;
}

function getMetricSortValue(value) {
  // Returns a sortable value for a metric field (actual and typical values)
  // from the supplied value, which for metric functions will be a single
  // valued array.
  return Array.isArray(value) && value.length > 0 ? value[0] : value;
}
