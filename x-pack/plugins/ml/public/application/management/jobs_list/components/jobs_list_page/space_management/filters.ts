/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SearchFilterConfig } from '@elastic/eui';
import type { MlSavedObjectType } from '../../../../../../../common/types/saved_objects';
import type {
  ManagementListResponse,
  ManagementItems,
  AnalyticsManagementItems,
  AnomalyDetectionManagementItems,
  TrainedModelsManagementItems,
} from '../../../../../../../common/types/management';

export function getFilters(mlSavedObjectType: MlSavedObjectType, jobs: ManagementListResponse) {
  switch (mlSavedObjectType) {
    case 'anomaly-detector':
      return createOptions<AnomalyDetectionManagementItems>(
        jobs as AnomalyDetectionManagementItems[],
        [
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
        ]
      );

    case 'data-frame-analytics':
      return createOptions(jobs as AnalyticsManagementItems[], [
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
      return createOptions(jobs as TrainedModelsManagementItems[], [
        [
          'type',
          i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
            defaultMessage: 'Type',
          }),
        ],
      ]);

    default:
      return undefined;
  }
}

function createOptions<T extends ManagementItems>(jobs: T[], matches: Array<[keyof T, string]>) {
  return matches.map(([field, name]) => {
    const options = [...new Set(jobs.map((j) => j[field]).flat())]
      .sort((a, b) => (a as string).localeCompare(b as string))
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
  }) as SearchFilterConfig[];
}
