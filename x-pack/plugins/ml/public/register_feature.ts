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
import { PLUGIN_ID } from '../common/constants/app';

export const registerFeature = (home: HomePublicPluginSetup) => {
  // TODO: Can this be removed now with homepage redesign work, or does this constitute a breaking change? This is no longer necessary for the home plugin
  // if file data visualizer can be registered as its own feature

  // register ML for the kibana home screen.
  // so the file data visualizer appears to allow people to import data
  home.environment.update({ ml: true });

  // register ML so it appears on the Kibana home page
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

  // TODO: is it okay to register this as a separate feature in the feature catalogue?
  // register data visualizer so it appears on the Kibana home page
  home.featureCatalogue.register({
    id: `${PLUGIN_ID}_file_data_visualizer`,
    title: i18n.translate('xpack.ml.fileDataVisualizerTitle', {
      defaultMessage: 'Upload a file',
    }),
    description: i18n.translate('xpack.ml.fileDataVisualizerDescription', {
      defaultMessage: 'Import your own CSV, NDJSON, or log file',
    }),
    icon: 'importAction',
    path: '/app/ml#/filedatavisualizer',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA,
  });
};
