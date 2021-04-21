/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { JOB_FIELD_TYPES } from '../../../common';

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
