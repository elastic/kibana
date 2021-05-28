/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { JOB_FIELD_TYPES } from '../../../../common';
import type { IndexPatternField } from '../../../../../../../src/plugins/data/common/index_patterns/fields';
import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/common';

export const jobTypeAriaLabels = {
  BOOLEAN: i18n.translate('xpack.fileDataVisualizer.fieldTypeIcon.booleanTypeAriaLabel', {
    defaultMessage: 'boolean type',
  }),
  DATE: i18n.translate('xpack.fileDataVisualizer.fieldTypeIcon.dateTypeAriaLabel', {
    defaultMessage: 'date type',
  }),
  GEO_POINT: i18n.translate('xpack.fileDataVisualizer.fieldTypeIcon.geoPointTypeAriaLabel', {
    defaultMessage: '{geoPointParam} type',
    values: {
      geoPointParam: 'geo point',
    },
  }),
  IP: i18n.translate('xpack.fileDataVisualizer.fieldTypeIcon.ipTypeAriaLabel', {
    defaultMessage: 'ip type',
  }),
  KEYWORD: i18n.translate('xpack.fileDataVisualizer.fieldTypeIcon.keywordTypeAriaLabel', {
    defaultMessage: 'keyword type',
  }),
  NUMBER: i18n.translate('xpack.fileDataVisualizer.fieldTypeIcon.numberTypeAriaLabel', {
    defaultMessage: 'number type',
  }),
  TEXT: i18n.translate('xpack.fileDataVisualizer.fieldTypeIcon.textTypeAriaLabel', {
    defaultMessage: 'text type',
  }),
  UNKNOWN: i18n.translate('xpack.fileDataVisualizer.fieldTypeIcon.unknownTypeAriaLabel', {
    defaultMessage: 'unknown type',
  }),
};

export const getJobTypeAriaLabel = (type: string) => {
  const requestedFieldType = Object.keys(JOB_FIELD_TYPES).find(
    (k) => JOB_FIELD_TYPES[k as keyof typeof JOB_FIELD_TYPES] === type
  );
  if (requestedFieldType === undefined) {
    return null;
  }
  return jobTypeAriaLabels[requestedFieldType as keyof typeof jobTypeAriaLabels];
};

// convert kibana types to ML Job types
// this is needed because kibana types only have string and not text and keyword.
// and we can't use ES_FIELD_TYPES because it has no NUMBER type
export function kbnTypeToJobType(field: IndexPatternField) {
  // Return undefined if not one of the supported data visualizer field types.
  let type;
  switch (field.type) {
    case KBN_FIELD_TYPES.STRING:
      type = field.aggregatable ? JOB_FIELD_TYPES.KEYWORD : JOB_FIELD_TYPES.TEXT;
      break;
    case KBN_FIELD_TYPES.NUMBER:
      type = JOB_FIELD_TYPES.NUMBER;
      break;
    case KBN_FIELD_TYPES.DATE:
      type = JOB_FIELD_TYPES.DATE;
      break;
    case KBN_FIELD_TYPES.IP:
      type = JOB_FIELD_TYPES.IP;
      break;
    case KBN_FIELD_TYPES.BOOLEAN:
      type = JOB_FIELD_TYPES.BOOLEAN;
      break;
    case KBN_FIELD_TYPES.GEO_POINT:
      type = JOB_FIELD_TYPES.GEO_POINT;
      break;
    case KBN_FIELD_TYPES.GEO_SHAPE:
      type = JOB_FIELD_TYPES.GEO_SHAPE;
      break;

    default:
      break;
  }

  return type;
}
