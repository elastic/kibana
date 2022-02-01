/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference } from 'lodash';
import { ES_FIELD_TYPES } from '../../../../../../../../src/plugins/data/common';
import type { FindFileStructureResponse } from '../../../../../../file_upload/common';
import type { JobFieldType } from '../../../../../common/types';
import { JOB_FIELD_TYPES } from '../../../../../common/constants';
export function getFieldNames(results: FindFileStructureResponse) {
  const { mappings, field_stats: fieldStats, column_names: columnNames } = results;

  // if columnNames exists (i.e delimited) use it for the field list
  // so we get the same order
  const tempFields = columnNames !== undefined ? columnNames : Object.keys(fieldStats);

  // there may be fields in the mappings which do not exist in the field_stats
  // e.g. the message field for a semi-structured log file, as they have no stats.
  // add any extra fields to the list
  const differenceFields = difference(Object.keys(mappings.properties), tempFields);

  // except @timestamp
  const timestampIndex = differenceFields.indexOf('@timestamp');
  if (timestampIndex !== -1) {
    differenceFields.splice(timestampIndex, 1);
  }

  if (differenceFields.length) {
    tempFields.push(...differenceFields);
  }
  return tempFields;
}

export function getSupportedFieldType(type: string): JobFieldType {
  switch (type) {
    case ES_FIELD_TYPES.FLOAT:
    case ES_FIELD_TYPES.HALF_FLOAT:
    case ES_FIELD_TYPES.SCALED_FLOAT:
    case ES_FIELD_TYPES.DOUBLE:
    case ES_FIELD_TYPES.INTEGER:
    case ES_FIELD_TYPES.LONG:
    case ES_FIELD_TYPES.SHORT:
    case ES_FIELD_TYPES.UNSIGNED_LONG:
      return JOB_FIELD_TYPES.NUMBER;

    case ES_FIELD_TYPES.DATE:
    case ES_FIELD_TYPES.DATE_NANOS:
      return JOB_FIELD_TYPES.DATE;

    default:
      return type as JobFieldType;
  }
}
