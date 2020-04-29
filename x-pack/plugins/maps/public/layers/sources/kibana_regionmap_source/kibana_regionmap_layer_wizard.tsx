/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
// @ts-ignore
import { KibanaRegionmapSource, sourceTitle } from './kibana_regionmap_source';
import { VectorLayer } from '../../vector_layer';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
// @ts-ignore
import { getKibanaRegionList } from '../../../meta';

export const kibanaRegionMapLayerWizardConfig: LayerWizard = {
  checkVisibility: () => {
    const regions = getKibanaRegionList();
    return regions.length;
  },
  description: i18n.translate('xpack.maps.source.kbnRegionMapDescription', {
    defaultMessage: 'Vector data from hosted GeoJSON configured in kibana.yml',
  }),
  icon: 'logoKibana',
  renderWizard: ({ previewLayer, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      const sourceDescriptor = KibanaRegionmapSource.createDescriptor(sourceConfig);
      const layerDescriptor = VectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayer(layerDescriptor);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
