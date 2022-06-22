/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MlSavedObjectType } from '../../../../../../../common/types/saved_objects';

export function getFilters(mlSavedObjectType: MlSavedObjectType, jobs: any[]) {
  switch (mlSavedObjectType) {
    case 'anomaly-detector':
      return createOptions(jobs, [
        [
          'jobState',
          i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
            defaultMessage: 'Job state',
          }),
        ],
        [
          'datafeedState',
          i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
            defaultMessage: 'Datafeed state',
          }),
        ],
      ]);

    case 'data-frame-analytics':
      return createOptions(jobs, [
        [
          'job_type',
          i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
            defaultMessage: 'Type',
          }),
        ],
        [
          'state',
          i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
            defaultMessage: 'Status',
          }),
        ],
      ]);
    case 'trained-model':
      return createOptions(jobs, [
        [
          'type',
          i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
            defaultMessage: 'Type',
          }),
        ],
      ]);
    default:
      return [];
  }
}

function createOptions(jobs: any[], matches: Array<[string, string]>) {
  return matches.map(([field, name]) => {
    const options = [...new Set(jobs.map((j) => j[field]).flat())]
      .sort((a, b) => a.localeCompare(b))
      .map((t) => ({
        value: t,
        name: t,
      }));

    return {
      type: 'field_value_selection',
      multiSelect: 'or',
      field,
      name,
      options,
    };
  });
}
