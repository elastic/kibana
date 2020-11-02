/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel } from '@elastic/eui';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
// @ts-ignore
import { VegaSource } from './vega_source';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';
import { VegaLayer } from "../../layers/vega_layer/vega_layer";

let called = false;
export const vegaLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  checkVisibility: async () => {
    return true; // TODO: implement
  },
  description: i18n.translate('xpack.maps.source.vegaDescription', {
    defaultMessage: 'Vega map layer',
  }),
  icon: 'grid',
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = () => {
      if (!called) {
        const layerDescriptor = VegaLayer.createDescriptor({
          sourceDescriptor: VegaSource.createDescriptor(),
        });
        previewLayers([layerDescriptor]);
        called = true;
      }
    };
    onSourceConfigChange();

    return (
      <EuiPanel>
        <div>{'VEGA VEGA VEGA'}</div>
      </EuiPanel>
    );
  },
  title: 'Vega vega vega',
};
