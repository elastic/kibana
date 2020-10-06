/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { MlLicense } from '../../../common/license';
import { PluginsSetup } from '../../types';

export function initSampleDataSets(mlLicense: MlLicense, plugins: PluginsSetup) {
  if (mlLicense.isMlEnabled() && mlLicense.isFullLicense()) {
    const sampleDataLinkLabel = i18n.translate('xpack.ml.sampleDataLinkLabel', {
      defaultMessage: 'ML jobs',
    });
    const { addAppLinksToSampleDataset } = plugins.home.sampleData;

    addAppLinksToSampleDataset('ecommerce', [
      {
        path:
          '/app/ml/modules/check_view_or_create?id=sample_data_ecommerce&index=ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        label: sampleDataLinkLabel,
        icon: 'machineLearningApp',
      },
    ]);

    addAppLinksToSampleDataset('logs', [
      {
        path:
          '/app/ml/modules/check_view_or_create?id=sample_data_weblogs&index=90943e30-9a47-11e8-b64d-95841ca0b247',
        label: sampleDataLinkLabel,
        icon: 'machineLearningApp',
      },
    ]);
  }
}
