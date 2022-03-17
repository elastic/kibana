/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { JOB_FIELD_TYPES } from '../../../../common/constants';
import { DataViewField } from '../../../../../../../src/plugins/data_views/public';
import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/common';

export const getJobTypeLabel = (type: string) => {
  return type in jobTypeLabels ? jobTypeLabels[type as keyof typeof jobTypeLabels] : null;
};

export const jobTypeLabels = {
  [JOB_FIELD_TYPES.BOOLEAN]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.booleanTypeLabel', {
    defaultMessage: 'Boolean',
  }),
  [JOB_FIELD_TYPES.DATE]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.dateTypeLabel', {
    defaultMessage: 'Date',
  }),
  [JOB_FIELD_TYPES.GEO_POINT]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.geoPointTypeLabel',
    {
      defaultMessage: 'Geo point',
    }
  ),
  [JOB_FIELD_TYPES.GEO_SHAPE]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.geoShapeTypeLabel',
    {
      defaultMessage: 'Geo shape',
    }
  ),
  [JOB_FIELD_TYPES.IP]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.ipTypeLabel', {
    defaultMessage: 'IP',
  }),
  [JOB_FIELD_TYPES.KEYWORD]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.keywordTypeLabel', {
    defaultMessage: 'Keyword',
  }),
  [JOB_FIELD_TYPES.NUMBER]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.numberTypeLabel', {
    defaultMessage: 'Number',
  }),
  [JOB_FIELD_TYPES.HISTOGRAM]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.histogramTypeLabel',
    {
      defaultMessage: 'Histogram',
    }
  ),
  [JOB_FIELD_TYPES.TEXT]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.textTypeLabel', {
    defaultMessage: 'Text',
  }),
  [JOB_FIELD_TYPES.UNKNOWN]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.unknownTypeLabel', {
    defaultMessage: 'Unknown',
  }),
};

// convert kibana types to ML Job types
// this is needed because kibana types only have string and not text and keyword.
// and we can't use ES_FIELD_TYPES because it has no NUMBER type
export function kbnTypeToJobType(field: DataViewField) {
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
    case KBN_FIELD_TYPES.HISTOGRAM:
      type = JOB_FIELD_TYPES.HISTOGRAM;
      break;

    default:
      break;
  }

  return type;
}
