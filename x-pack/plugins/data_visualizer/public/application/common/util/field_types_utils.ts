/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import { SUPPORTED_FIELD_TYPES } from '../../../../common/constants';

export const getJobTypeLabel = (type: string) => {
  return type in jobTypeLabels ? jobTypeLabels[type as keyof typeof jobTypeLabels] : null;
};

export const jobTypeLabels = {
  [SUPPORTED_FIELD_TYPES.BOOLEAN]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.booleanTypeLabel',
    {
      defaultMessage: 'Boolean',
    }
  ),
  [SUPPORTED_FIELD_TYPES.DATE]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.dateTypeLabel', {
    defaultMessage: 'Date',
  }),
  [SUPPORTED_FIELD_TYPES.GEO_POINT]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.geoPointTypeLabel',
    {
      defaultMessage: 'Geo point',
    }
  ),
  [SUPPORTED_FIELD_TYPES.GEO_SHAPE]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.geoShapeTypeLabel',
    {
      defaultMessage: 'Geo shape',
    }
  ),
  [SUPPORTED_FIELD_TYPES.IP]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.ipTypeLabel', {
    defaultMessage: 'IP',
  }),
  [SUPPORTED_FIELD_TYPES.KEYWORD]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.keywordTypeLabel',
    {
      defaultMessage: 'Keyword',
    }
  ),
  [SUPPORTED_FIELD_TYPES.NUMBER]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.numberTypeLabel',
    {
      defaultMessage: 'Number',
    }
  ),
  [SUPPORTED_FIELD_TYPES.HISTOGRAM]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.histogramTypeLabel',
    {
      defaultMessage: 'Histogram',
    }
  ),
  [SUPPORTED_FIELD_TYPES.TEXT]: i18n.translate('xpack.dataVisualizer.fieldTypeIcon.textTypeLabel', {
    defaultMessage: 'Text',
  }),
  [SUPPORTED_FIELD_TYPES.UNKNOWN]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.unknownTypeLabel',
    {
      defaultMessage: 'Unknown',
    }
  ),
  [SUPPORTED_FIELD_TYPES.VERSION]: i18n.translate(
    'xpack.dataVisualizer.fieldTypeIcon.versionTypeLabel',
    {
      defaultMessage: 'Version',
    }
  ),
};

// convert kibana types to ML Job types
// this is needed because kibana types only have string and not text and keyword.
// and we can't use ES_FIELD_TYPES because it has no NUMBER type
export function kbnTypeToJobType(field: DataViewField) {
  // Return undefined if not one of the supported data visualizer field types.
  let type;

  switch (field.type) {
    case KBN_FIELD_TYPES.STRING:
      type = field.aggregatable ? SUPPORTED_FIELD_TYPES.KEYWORD : SUPPORTED_FIELD_TYPES.TEXT;

      if (field.esTypes?.includes(SUPPORTED_FIELD_TYPES.VERSION)) {
        type = SUPPORTED_FIELD_TYPES.VERSION;
      }
      break;
    case KBN_FIELD_TYPES.NUMBER:
      type = SUPPORTED_FIELD_TYPES.NUMBER;
      break;
    case KBN_FIELD_TYPES.DATE:
      type = SUPPORTED_FIELD_TYPES.DATE;
      break;
    case KBN_FIELD_TYPES.IP:
      type = SUPPORTED_FIELD_TYPES.IP;
      break;
    case KBN_FIELD_TYPES.BOOLEAN:
      type = SUPPORTED_FIELD_TYPES.BOOLEAN;
      break;
    case KBN_FIELD_TYPES.GEO_POINT:
      type = SUPPORTED_FIELD_TYPES.GEO_POINT;
      break;
    case KBN_FIELD_TYPES.GEO_SHAPE:
      type = SUPPORTED_FIELD_TYPES.GEO_SHAPE;
      break;
    case KBN_FIELD_TYPES.HISTOGRAM:
      type = SUPPORTED_FIELD_TYPES.HISTOGRAM;
      break;

    default:
      break;
  }

  return type;
}
