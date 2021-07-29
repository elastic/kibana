/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import uuid from 'uuid';
import { LAYER_WIZARD_CATEGORY, STYLE_TYPE } from '../../../maps/common/constants';
import { AnomalySource, AnomalySourceDescriptor } from './anomaly_source';
import { CreateAnomalySourceEditor } from './create_anomaly_source_editor';
import {
  VectorLayerDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../maps/common/descriptor_types';
import type { LayerWizard, RenderWizardArguments } from '../../../maps/public';

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
    const onSourceConfigChange = (sourceConfig: Partial<AnomalySourceDescriptor> | null) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      // remove usage of VectorLayer.createDescriptor. should be hardcoded to actual descriptor
      const anomalyLayerDescriptor: VectorLayerDescriptor = {
        id: uuid(),
        type: 'VECTOR',
        sourceDescriptor: AnomalySource.createDescriptor({
          jobId: sourceConfig.jobId,
          typicalActual: sourceConfig.typicalActual,
        }),
        style: {
          type: 'VECTOR',
          properties: ({
            fillColor: {
              type: STYLE_TYPE.STATIC,
              options: {
                color: 'rgb(255,0,0)',
              },
            },
          } as unknown) as VectorStylePropertiesDescriptor,
          isTimeAware: false,
        },
      };

      previewLayers([anomalyLayerDescriptor]);
    };

    return <CreateAnomalySourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: i18n.translate('xpack.ml.maps.anomalyLayerTitle', {
    defaultMessage: 'ML Anomalies',
  }),
};
