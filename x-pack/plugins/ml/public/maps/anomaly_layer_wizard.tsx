/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// @ts-expect-error
import React from 'react';
import { LAYER_WIZARD_CATEGORY } from '../../../maps/common/constants';
import type {
  LayerWizard,
  RenderWizardArguments,
} from '../../../maps/public/classes/layers/layer_wizard_registry';
import { VectorStyle } from '../../../maps/public/classes/styles/vector/vector_style';
import { AnomalySource, AnomalySourceDescriptor } from './anomaly_source';
import { VectorLayer } from '../../../maps/public/classes/layers/vector_layer/vector_layer';
import { CreateAnomalySourceEditor } from './create_anomaly_source_editor';

export const anomalyLayerWizard: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.SOLUTIONS],
  description: i18n.translate('xpack.ml.maps.anomalyLayerDescription', {
    defaultMessage: 'Create anomalies layers',
  }),
  disabledReason: i18n.translate('xpack.ml.maps.anomalyLayerUnavailableMessage', {
    defaultMessage:
      'Whatever reason the user cannot see ML card (likely because no enterprise license or no ML privileges)',
  }),
  icon: 'outlierDetectionJob',
  getIsDisabled: () => {
    // Do enterprise license check
    // Do check if user has access to job (namespace chec or whatever)
    return false;
  },
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<AnomalySourceDescriptor>) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const layerDescriptor = VectorLayer.createDescriptor({
        sourceDescriptor: AnomalySource.createDescriptor(sourceConfig),
        style: VectorStyle.createDescriptor({}),
      });

      previewLayers([layerDescriptor]);
    };

    return <CreateAnomalySourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: i18n.translate('xpack.ml.maps.anomalyLayerTitle', {
    defaultMessage: '',
  }),
};
