/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { getFieldNames, getSupportedFieldType } from './get_field_names';
import { FileBasedFieldVisConfig } from '../stats_table/types';
import { JOB_FIELD_TYPES } from '../../../../../common/constants';
import { roundToDecimalPlace } from '../utils';

export function createFields(results: FindFileStructureResponse) {
  const {
    mappings,
    field_stats: fieldStats,
    num_messages_analyzed: numMessagesAnalyzed,
    timestamp_field: timestampField,
  } = results;

  let numericFieldsCount = 0;

  if (mappings && mappings.properties && fieldStats) {
    const fieldNames = getFieldNames(results);

    const items = fieldNames.map((name) => {
      if (fieldStats[name] !== undefined) {
        const field: FileBasedFieldVisConfig = {
          fieldName: name,
          type: JOB_FIELD_TYPES.UNKNOWN,
        };
        const f = fieldStats[name];
        const m = mappings.properties[name];

        // sometimes the timestamp field is not in the mappings, and so our
        // collection of fields will be missing a time field with a type of date
        if (name === timestampField && field.type === JOB_FIELD_TYPES.UNKNOWN) {
          field.type = JOB_FIELD_TYPES.DATE;
        }

        if (m !== undefined) {
          field.type = getSupportedFieldType(m.type);
          if (field.type === JOB_FIELD_TYPES.NUMBER) {
            numericFieldsCount += 1;
          }
          if (m.format !== undefined) {
            field.format = m.format;
          }
        }

        let _stats = {};

        // round min, max, median, mean to 2dp.
        if (f.median_value !== undefined) {
          _stats = {
            ..._stats,
            median: roundToDecimalPlace(f.median_value),
            mean: roundToDecimalPlace(f.mean_value),
            min: roundToDecimalPlace(f.min_value),
            max: roundToDecimalPlace(f.max_value),
          };
        }
        if (f.cardinality !== undefined) {
          _stats = {
            ..._stats,
            cardinality: f.cardinality,
            count: f.count,
            sampleCount: numMessagesAnalyzed,
          };
        }

        if (f.top_hits !== undefined) {
          if (field.type === JOB_FIELD_TYPES.TEXT) {
            _stats = {
              ..._stats,
              examples: f.top_hits.map((hit) => hit.value),
            };
          } else {
            _stats = {
              ..._stats,
              topValues: f.top_hits.map((hit) => ({ key: hit.value, doc_count: hit.count })),
            };
          }
        }

        if (field.type === JOB_FIELD_TYPES.DATE) {
          _stats = {
            ..._stats,
            earliest: f.earliest,
            latest: f.latest,
          };
        }

        field.stats = _stats;
        return field;
      } else {
        // field is not in the field stats
        // this could be the message field for a semi-structured log file or a
        // field which the endpoint has not been able to work out any information for
        const type =
          mappings.properties[name] && mappings.properties[name].type === JOB_FIELD_TYPES.TEXT
            ? JOB_FIELD_TYPES.TEXT
            : JOB_FIELD_TYPES.UNKNOWN;

        return {
          fieldName: name,
          type,
          stats: {
            mean: 0,
            count: 0,
            sampleCount: numMessagesAnalyzed,
            cardinality: 0,
          },
        };
      }
    });

    return {
      fields: items,
      totalFieldsCount: items.length,
      totalMetricFieldsCount: numericFieldsCount,
    };
  }

  return { fields: [], totalFieldsCount: 0, totalMetricFieldsCount: 0 };
}
