/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
// @ts-ignore
import { KibanaRegionmapSource, sourceTitle } from './kibana_regionmap_source';
import { VectorLayer } from '../../layers/vector_layer/vector_layer';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
import { getKibanaRegionList } from '../../../meta';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

export const kibanaRegionMapLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  checkVisibility: async () => {
    const regions = getKibanaRegionList();
    return regions.length > 0;
  },
  description: i18n.translate('xpack.maps.source.kbnRegionMapDescription', {
    defaultMessage: 'Vector data from hosted GeoJSON configured in kibana.yml',
  }),
  icon: 'logoKibana',
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      const sourceDescriptor = KibanaRegionmapSource.createDescriptor(sourceConfig);
      const layerDescriptor = VectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayers([layerDescriptor]);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
