/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  HomePublicPluginSetup,
  FeatureCatalogueCategory,
} from '../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { PLUGIN_ID } from '../common/constants/app';
import { MINIMUM_LICENSE } from '../common/license';
import { LICENSE_CHECK_STATE } from '../../licensing/common/types';

export const registerFeature = (license: LicensingPluginSetup, home: HomePublicPluginSetup) => {
  license.license$.subscribe(async lic => {
    if (lic.check(PLUGIN_ID, MINIMUM_LICENSE).state === LICENSE_CHECK_STATE.Valid) {
      // register ML for the kibana home screen.
      // so the file data visualizer appears to allow people to import data
      home.environment.update({ ml: true });

      // register ML to appear on the app list
      home.featureCatalogue.register({
        id: PLUGIN_ID,
        title: i18n.translate('xpack.ml.machineLearningTitle', {
          defaultMessage: 'Machine Learning',
        }),
        description: i18n.translate('xpack.ml.machineLearningDescription', {
          defaultMessage:
            'Automatically model the normal behavior of your time series data to detect anomalies.',
        }),
        icon: 'machineLearningApp',
        path: '/app/ml',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.DATA,
      });
    }
  });
};
