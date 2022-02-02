/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LAYER_WIZARD_CATEGORY } from '../../../maps/common';
import type { LayerWizard } from '../../../maps/public';

export const anomalyLayerWizard: Partial<LayerWizard> = {
  categories: [LAYER_WIZARD_CATEGORY.SOLUTIONS, LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.ml.maps.anomalyLayerDescription', {
    defaultMessage: 'Display anomalies from a machine learning job',
  }),
  disabledReason: i18n.translate('xpack.ml.maps.anomalyLayerUnavailableMessage', {
    defaultMessage:
      'Anomalies layers are a subscription feature. Ensure you have the right subscription and access to Machine Learning.',
  }),
  icon: 'outlierDetectionJob',
  getIsDisabled: () => {
    // return false by default
    return false;
  },
  title: i18n.translate('xpack.ml.maps.anomalyLayerTitle', {
    defaultMessage: 'ML Anomalies',
  }),
  order: 100,
};
